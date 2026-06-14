const fs = require("fs");
const csv = require("csv-parser");
const pool = require("../db");

// Predefined exchange rates relative to base currency (INR)
const EXCHANGE_RATES = {
  INR: 1.0,
  USD: 83.0,
  EUR: 90.0,
  GBP: 105.0,
};

// Aliases requiring manual review
const ALIASES = ["priya", "priya s"];

/**
 * Normalizes description by converting to lowercase, removing punctuation,
 * and filtering out common filler words to detect potential duplicates.
 */
function normalizeDescription(desc) {
  if (!desc) return "";
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // Replace non-alphanumeric chars with space
    .split(/\s+/)
    .filter(
      (word) =>
        ![
          "at",
          "for",
          "the",
          "in",
          "and",
          "a",
          "an",
          "on",
          "to",
          "with",
          "from",
          "of",
          "-",
        ].includes(word)
    )
    .join(" ")
    .trim();
}

/**
 * Checks if a name/email matches any predefined user aliases.
 */
function isAlias(str) {
  if (!str) return false;
  return ALIASES.includes(str.trim().toLowerCase());
}

/**
 * Parses and computes split values based on split_type and split_details.
 */
function parseSplitDetails(splitType, splitDetailsStr, numParticipants, totalAmount) {
  const normalizedType = splitType ? splitType.trim().toUpperCase() : "EQUAL";

  if (normalizedType === "EQUAL") {
    const shareValue = totalAmount / numParticipants;
    return { valid: true, shares: Array(numParticipants).fill(shareValue) };
  }

  if (!splitDetailsStr) {
    return { valid: false, error: `Split details are required for split type ${normalizedType}.` };
  }

  const parts = splitDetailsStr.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length !== numParticipants) {
    return {
      valid: false,
      error: `Number of split details (${parts.length}) does not match number of participants (${numParticipants}).`,
    };
  }

  const values = parts.map(Number);
  if (values.some(isNaN)) {
    return { valid: false, error: "Split details contain invalid non-numeric values." };
  }

  const shares = [];
  if (normalizedType === "PERCENT") {
    const sum = values.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.1) {
      return { valid: false, error: `Percentage split details must sum to 100. Current sum: ${sum}` };
    }
    for (const pct of values) {
      shares.push(totalAmount * (pct / 100));
    }
  } else if (normalizedType === "EXACT" || normalizedType === "AMOUNT") {
    const sum = values.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - totalAmount) > 0.05) {
      return {
        valid: false,
        error: `Exact split details must sum to total amount (${totalAmount}). Current sum: ${sum}`,
      };
    }
    shares.push(...values);
  } else if (normalizedType === "SHARE" || normalizedType === "RATIO") {
    const sum = values.reduce((a, b) => a + b, 0);
    if (sum === 0) {
      return { valid: false, error: "Total shares cannot be zero." };
    }
    for (const ratio of values) {
      shares.push(totalAmount * (ratio / sum));
    }
  } else {
    return { valid: false, error: `Unsupported split type: ${normalizedType}` };
  }

  return { valid: true, shares };
}

/**
 * Parses and processes a CSV export file and imports expenses for a group.
 * 
 * @param {string} filePath Filepath of the CSV to import.
 * @param {number} groupId Group ID to import the expenses into.
 */
async function importCSV(filePath, groupId) {
  const rows = [];

  // Parse CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim().toLowerCase(),
        })
      )
      .on("data", (data) => rows.push(data))
      .on("end", resolve)
      .on("error", reject);
  });

  const totalRows = rows.length;
  let validRowsCount = 0;
  let anomaliesCount = 0;
  const actionsTaken = [];
  const anomaliesList = [];

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verify group existence
    const groupRes = await client.query("SELECT id, name FROM groups WHERE id = $1", [groupId]);
    if (groupRes.rows.length === 0) {
      throw new Error(`Group with ID ${groupId} does not exist in the database.`);
    }

    // Lookup caches
    const userCache = {}; // email/name -> user object
    const groupMembersCache = {}; // group_id -> list of members with joined/left dates
    const dbExpensesByDateCache = {}; // dateStr -> list of { description, amount }
    const processedInBatch = new Set(); // composite keys for batch duplicates

    // Resolves a user by searching email or name (case-insensitive)
    const resolveUser = async (identifier) => {
      const trimmed = identifier.trim().toLowerCase();
      if (userCache[trimmed] !== undefined) {
        return userCache[trimmed];
      }
      const res = await client.query(
        "SELECT id, name, email FROM users WHERE LOWER(email) = $1 OR LOWER(name) = $1",
        [trimmed]
      );
      const user = res.rows[0] || null;
      userCache[trimmed] = user;
      return user;
    };

    // Fetches all membership records for the group
    const getGroupMembers = async () => {
      if (groupMembersCache[groupId] !== undefined) {
        return groupMembersCache[groupId];
      }
      const res = await client.query(
        "SELECT user_id, joined_at, left_at FROM group_members WHERE group_id = $1",
        [groupId]
      );
      groupMembersCache[groupId] = res.rows;
      return res.rows;
    };

    // Checks if user is an active member of the group on the expense date
    const checkMembershipOnDate = (userId, dateStr, membersList) => {
      const expenseTime = new Date(dateStr).getTime();
      return membersList.some((member) => {
        if (member.user_id !== userId) return false;
        const joinedTime = new Date(member.joined_at).getTime();
        const leftTime = member.left_at ? new Date(member.left_at).getTime() : null;
        return joinedTime <= expenseTime && (!leftTime || leftTime >= expenseTime);
      });
    };

    // Queries DB for existing expenses on a particular date to check for duplicates
    const getDbExpensesForDate = async (dateStr) => {
      if (dbExpensesByDateCache[dateStr] !== undefined) {
        return dbExpensesByDateCache[dateStr];
      }
      const res = await client.query(
        "SELECT description, amount FROM expenses WHERE group_id = $1 AND expense_date = $2",
        [groupId, dateStr]
      );
      dbExpensesByDateCache[dateStr] = res.rows;
      return res.rows;
    };

    // Process rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      // Extract raw columns
      const dateStr = row.date ? row.date.trim() : "";
      const description = row.description ? row.description.trim() : "";
      const paidByStr = row.paid_by ? row.paid_by.trim() : "";
      const amountStr = row.amount ? row.amount.trim() : "";
      const currency = row.currency ? row.currency.trim().toUpperCase() : "INR";
      const splitType = row.split_type ? row.split_type.trim().toUpperCase() : "EQUAL";
      const splitWithStr = row.split_with ? row.split_with.trim() : "";
      const splitDetailsStr = row.split_details ? row.split_details.trim() : "";

      const anomaliesFoundForRow = [];
      let amount = null;
      let payer = null;
      let resolvedParticipants = [];
      let participantShares = [];

      // 1. Alias Detection check
      let aliasValueDetected = null;
      if (isAlias(paidByStr)) {
        aliasValueDetected = paidByStr;
      } else if (splitWithStr) {
        const parts = splitWithStr.split(",").map((p) => p.trim());
        const matchedAlias = parts.find(isAlias);
        if (matchedAlias) {
          aliasValueDetected = matchedAlias;
        }
      }

      if (aliasValueDetected) {
        anomaliesFoundForRow.push({
          type: "ALIAS_DETECTED",
          description: `User alias "${aliasValueDetected}" detected. Requires manual review.`,
        });
      }

      // 2. Amount Validation (Negative numbers are treated as valid potential refunds)
      if (!amountStr) {
        anomaliesFoundForRow.push({
          type: "ZERO_AMOUNT",
          description: "Amount is missing.",
        });
      } else {
        amount = parseFloat(amountStr);
        if (isNaN(amount)) {
          anomaliesFoundForRow.push({
            type: "ZERO_AMOUNT",
            description: `Amount "${amountStr}" is not a valid number.`,
          });
        } else if (amount === 0) {
          anomaliesFoundForRow.push({
            type: "ZERO_AMOUNT",
            description: "Amount is zero.",
          });
        }
      }

      // 3. Currency Validation & exchange rate mapping
      if (!row.currency) {
        anomaliesFoundForRow.push({
          type: "MISSING_CURRENCY",
          description: "Currency is missing.",
        });
      }
      const exchangeRate = EXCHANGE_RATES[currency] || 1.0;

      // 4. Date Validation
      let isValidDate = false;
      if (!dateStr) {
        anomaliesFoundForRow.push({
          type: "INVALID_DATE",
          description: "Expense date is missing.",
        });
      } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateStr)) {
          anomaliesFoundForRow.push({
            type: "INVALID_DATE",
            description: `Expense date "${dateStr}" is not in YYYY-MM-DD format.`,
          });
        } else {
          const parsedDate = new Date(dateStr);
          if (isNaN(parsedDate.getTime())) {
            anomaliesFoundForRow.push({
              type: "INVALID_DATE",
              description: `Expense date "${dateStr}" is invalid.`,
            });
          } else {
            const [year, month, day] = dateStr.split("-").map(Number);
            if (
              parsedDate.getUTCFullYear() !== year ||
              parsedDate.getUTCMonth() + 1 !== month ||
              parsedDate.getUTCDate() !== day
            ) {
              anomaliesFoundForRow.push({
                type: "INVALID_DATE",
                description: `Expense date "${dateStr}" is an invalid calendar date.`,
              });
            } else {
              isValidDate = true;
            }
          }
        }
      }

      // 5. Payer Validation
      if (!paidByStr) {
        anomaliesFoundForRow.push({
          type: "MISSING_PAYER",
          description: "Payer (paid_by) is missing.",
        });
      } else if (isValidDate) {
        payer = await resolveUser(paidByStr);
        if (!payer) {
          anomaliesFoundForRow.push({
            type: "MISSING_PAYER",
            description: `Payer "${paidByStr}" does not exist in the database.`,
          });
        } else {
          // Double-check resolved db name/email for alias too
          if (isAlias(payer.name) || isAlias(payer.email)) {
            anomaliesFoundForRow.push({
              type: "ALIAS_DETECTED",
              description: `Payer resolved to user with alias details "${payer.name}/${payer.email}". Requires manual review.`,
            });
          }

          const members = await getGroupMembers();
          if (!checkMembershipOnDate(payer.id, dateStr, members)) {
            anomaliesFoundForRow.push({
              type: "MISSING_PAYER",
              description: `Payer "${paidByStr}" is not a member of the group on the expense date (${dateStr}).`,
            });
          }
        }
      }

      // 6. Participants (split_with) & Split Details Validation
      if (isValidDate && anomaliesFoundForRow.length === 0) {
        const members = await getGroupMembers();

        if (splitWithStr) {
          const splitWithParts = splitWithStr.split(",").map((s) => s.trim()).filter(Boolean);
          let participantError = false;

          for (const part of splitWithParts) {
            const u = await resolveUser(part);
            if (!u) {
              anomaliesFoundForRow.push({
                type: "INVALID_PARTICIPANTS",
                description: `Participant "${part}" does not exist in the database.`,
              });
              participantError = true;
            } else {
              if (isAlias(u.name) || isAlias(u.email)) {
                anomaliesFoundForRow.push({
                  type: "ALIAS_DETECTED",
                  description: `Participant "${part}" resolved to alias "${u.name}/${u.email}". Requires manual review.`,
                });
                participantError = true;
              }
              if (!checkMembershipOnDate(u.id, dateStr, members)) {
                anomaliesFoundForRow.push({
                  type: "INVALID_PARTICIPANTS",
                  description: `Participant "${part}" was not a member of the group on the expense date (${dateStr}).`,
                });
                participantError = true;
              } else {
                resolvedParticipants.push(u);
              }
            }
          }

          if (!participantError && resolvedParticipants.length > 0) {
            const splitResult = parseSplitDetails(
              splitType,
              splitDetailsStr,
              resolvedParticipants.length,
              amount
            );
            if (!splitResult.valid) {
              anomaliesFoundForRow.push({
                type: "INVALID_SPLIT_DETAILS",
                description: splitResult.error,
              });
            } else {
              participantShares = splitResult.shares;
            }
          }
        } else {
          // Default: split equally among all members who were active on the expense date
          const activeMembers = members.filter((m) =>
            checkMembershipOnDate(m.user_id, dateStr, members)
          );

          if (activeMembers.length === 0) {
            anomaliesFoundForRow.push({
              type: "INVALID_PARTICIPANTS",
              description: `Group has no active members on the expense date (${dateStr}) to split with.`,
            });
          } else {
            for (const am of activeMembers) {
              const uRes = await client.query(
                "SELECT id, name, email FROM users WHERE id = $1",
                [am.user_id]
              );
              if (uRes.rows[0]) {
                resolvedParticipants.push(uRes.rows[0]);
              }
            }
            const share = amount / resolvedParticipants.length;
            participantShares = Array(resolvedParticipants.length).fill(share);
          }
        }
      }

      // 7. Duplicate Check
      if (isValidDate && anomaliesFoundForRow.length === 0 && payer) {
        const targetNorm = normalizeDescription(description);
        const batchKey = `${groupId}|${targetNorm}|${amount.toFixed(4)}|${dateStr}`;

        // Check Batch Duplicates
        if (processedInBatch.has(batchKey)) {
          anomaliesFoundForRow.push({
            type: "DUPLICATE_EXPENSE",
            description: `Potential duplicate expense detected in the current import file batch.`,
          });
        } else {
          // Check DB Duplicates
          const dbExpenses = await getDbExpensesForDate(dateStr);
          const isDbDuplicate = dbExpenses.some((dbExp) => {
            return (
              Math.abs(parseFloat(dbExp.amount) - amount) < 0.01 &&
              normalizeDescription(dbExp.description) === targetNorm
            );
          });

          if (isDbDuplicate) {
            anomaliesFoundForRow.push({
              type: "DUPLICATE_EXPENSE",
              description: `Potential duplicate expense already exists in the database.`,
            });
          } else {
            processedInBatch.add(batchKey);
          }
        }
      }

      // Log/Save Result
      if (anomaliesFoundForRow.length > 0) {
        const primaryAnomaly = anomaliesFoundForRow[0];
        const combinedDescription = anomaliesFoundForRow
          .map((a) => a.description)
          .join(" | ");

        await client.query(
          `INSERT INTO import_anomalies (row_number, anomaly_type, description, action_taken, approved)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            rowNumber,
            primaryAnomaly.type,
            combinedDescription,
            primaryAnomaly.type === "ALIAS_DETECTED" ? "Requires review" : "Skipped row import",
            false,
          ]
        );

        anomaliesCount++;
        anomaliesList.push({
          row: rowNumber,
          type: primaryAnomaly.type,
          description: combinedDescription,
          action: primaryAnomaly.type === "ALIAS_DETECTED" ? "Requires review" : "Skipped row import",
        });
        actionsTaken.push(
          `Row ${rowNumber}: Skipped (Anomaly: ${primaryAnomaly.type} - ${primaryAnomaly.description})`
        );
      } else {
        // Insert Expense
        const expenseInsertRes = await client.query(
          `INSERT INTO expenses (group_id, description, amount, currency, exchange_rate, paid_by, expense_date, split_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [groupId, description, amount, currency, exchangeRate, payer.id, dateStr, splitType]
        );
        const expenseId = expenseInsertRes.rows[0].id;

        // Insert Participants
        for (let idx = 0; idx < resolvedParticipants.length; idx++) {
          const participant = resolvedParticipants[idx];
          const shareVal = participantShares[idx];

          await client.query(
            `INSERT INTO expense_participants (expense_id, user_id, share_value)
             VALUES ($1, $2, $3)`,
            [expenseId, participant.id, shareVal]
          );
        }

        validRowsCount++;
        actionsTaken.push(
          `Row ${rowNumber}: Imported expense "${description}" of ${amount} ${currency}`
        );
      }
    }

    await client.query("COMMIT");

    return {
      totalRows,
      validRows: validRowsCount,
      anomaliesFound: anomaliesCount,
      actionsTaken,
      anomalies: anomaliesList,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  importCSV,
};
