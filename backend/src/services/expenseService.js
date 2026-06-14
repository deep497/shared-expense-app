const pool = require("../db");

/**
 * Validates whether a user was a group member on the specified expense date.
 */
function isMemberOnDate(userId, dateStr, membersList) {
  const expenseTime = new Date(dateStr).getTime();
  return membersList.some((member) => {
    if (member.user_id !== userId) return false;
    const joinedTime = new Date(member.joined_at).getTime();
    const leftTime = member.left_at ? new Date(member.left_at).getTime() : null;
    return joinedTime <= expenseTime && (!leftTime || leftTime >= expenseTime);
  });
}

/**
 * Creates an expense and its participant splits in a transaction.
 */
async function createExpense(data) {
  const {
    groupId,
    description,
    amount,
    currency,
    exchangeRate,
    paidBy,
    expenseDate,
    splitType,
    participants,
  } = data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Fetch group members to validate date range membership
    const membersRes = await client.query(
      "SELECT user_id, joined_at, left_at FROM group_members WHERE group_id = $1",
      [groupId]
    );
    const members = membersRes.rows;

    // 2. Validate payer membership
    if (!isMemberOnDate(paidBy, expenseDate, members)) {
      throw {
        status: 400,
        message: `Payer (User ID ${paidBy}) is not an active member of group ${groupId} on the expense date (${expenseDate}).`,
      };
    }

    // 3. Validate participants membership and shares sum
    let sumShares = 0;
    for (const p of participants) {
      if (!isMemberOnDate(p.userId, expenseDate, members)) {
        throw {
          status: 400,
          message: `Participant (User ID ${p.userId}) is not an active member of group ${groupId} on the expense date (${expenseDate}).`,
        };
      }
      sumShares += parseFloat(p.shareValue);
    }

    if (Math.abs(sumShares - parseFloat(amount)) > 0.05) {
      throw {
        status: 400,
        message: `Sum of participant shares (${sumShares}) does not equal the expense amount (${amount}).`,
      };
    }

    // 4. Insert expense record
    const expenseRes = await client.query(
      `INSERT INTO expenses (group_id, description, amount, currency, exchange_rate, paid_by, expense_date, split_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, group_id, description, amount, currency, exchange_rate, paid_by, expense_date, split_type, created_at`,
      [groupId, description, amount, currency, exchangeRate || 1.0, paidBy, expenseDate, splitType]
    );
    const expense = expenseRes.rows[0];

    // 5. Insert participant shares
    const participantsList = [];
    for (const p of participants) {
      const epRes = await client.query(
        `INSERT INTO expense_participants (expense_id, user_id, share_value)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, share_value`,
        [expense.id, p.userId, p.shareValue]
      );
      participantsList.push({
        userId: epRes.rows[0].user_id,
        shareValue: parseFloat(epRes.rows[0].share_value),
      });
    }

    await client.query("COMMIT");

    return {
      ...expense,
      expense_date: expense.expense_date ? expense.expense_date.toISOString().split("T")[0] : null,
      amount: parseFloat(expense.amount),
      exchange_rate: parseFloat(expense.exchange_rate),
      participants: participantsList,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Retrieves an expense details and its participant splits by ID.
 */
async function getExpenseById(id) {
  const expenseRes = await pool.query(
    `SELECT id, group_id, description, amount, currency, exchange_rate, paid_by, expense_date, split_type, created_at 
     FROM expenses WHERE id = $1`,
    [id]
  );
  if (expenseRes.rows.length === 0) {
    return null;
  }

  const expense = expenseRes.rows[0];

  const epRes = await pool.query(
    "SELECT user_id, share_value FROM expense_participants WHERE expense_id = $1",
    [id]
  );

  return {
    ...expense,
    expense_date: expense.expense_date ? expense.expense_date.toISOString().split("T")[0] : null,
    amount: parseFloat(expense.amount),
    exchange_rate: parseFloat(expense.exchange_rate),
    participants: epRes.rows.map((r) => ({
      userId: r.user_id,
      shareValue: parseFloat(r.share_value),
    })),
  };
}

/**
 * Gets all expenses for a group, including their participant splits.
 */
async function getExpensesForGroup(groupId) {
  const expensesRes = await pool.query(
    `SELECT id, group_id, description, amount, currency, exchange_rate, paid_by, expense_date, split_type, created_at 
     FROM expenses WHERE group_id = $1 ORDER BY expense_date DESC, id DESC`,
    [groupId]
  );
  const expenses = expensesRes.rows;

  if (expenses.length === 0) {
    return [];
  }

  // Fetch all participant entries for these expenses to map efficiently in-memory
  const expenseIds = expenses.map((e) => e.id);
  const epRes = await pool.query(
    `SELECT expense_id, user_id, share_value 
     FROM expense_participants 
     WHERE expense_id = ANY($1) 
     ORDER BY id`,
    [expenseIds]
  );

  const participantsMap = {};
  for (const row of epRes.rows) {
    if (!participantsMap[row.expense_id]) {
      participantsMap[row.expense_id] = [];
    }
    participantsMap[row.expense_id].push({
      userId: row.user_id,
      shareValue: parseFloat(row.share_value),
    });
  }

  return expenses.map((e) => ({
    ...e,
    expense_date: e.expense_date ? e.expense_date.toISOString().split("T")[0] : null,
    amount: parseFloat(e.amount),
    exchange_rate: parseFloat(e.exchange_rate),
    participants: participantsMap[e.id] || [],
  }));
}

/**
 * Updates an expense and its participant splits in a transaction.
 */
async function updateExpense(id, data) {
  const {
    groupId,
    description,
    amount,
    currency,
    exchangeRate,
    paidBy,
    expenseDate,
    splitType,
    participants,
  } = data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Verify expense exists
    const checkRes = await client.query("SELECT id FROM expenses WHERE id = $1", [id]);
    if (checkRes.rows.length === 0) {
      throw { status: 404, message: `Expense with ID ${id} not found.` };
    }

    // 2. Fetch group members to validate membership date ranges
    const membersRes = await client.query(
      "SELECT user_id, joined_at, left_at FROM group_members WHERE group_id = $1",
      [groupId]
    );
    const members = membersRes.rows;

    // 3. Validate payer membership on date
    if (!isMemberOnDate(paidBy, expenseDate, members)) {
      throw {
        status: 400,
        message: `Payer (User ID ${paidBy}) is not an active member of group ${groupId} on the expense date (${expenseDate}).`,
      };
    }

    // 4. Validate participants membership on date & share values sum
    let sumShares = 0;
    for (const p of participants) {
      if (!isMemberOnDate(p.userId, expenseDate, members)) {
        throw {
          status: 400,
          message: `Participant (User ID ${p.userId}) is not an active member of group ${groupId} on the expense date (${expenseDate}).`,
        };
      }
      sumShares += parseFloat(p.shareValue);
    }

    if (Math.abs(sumShares - parseFloat(amount)) > 0.05) {
      throw {
        status: 400,
        message: `Sum of participant shares (${sumShares}) does not equal the expense amount (${amount}).`,
      };
    }

    // 5. Update expenses record
    const updateRes = await client.query(
      `UPDATE expenses 
       SET group_id = $1, description = $2, amount = $3, currency = $4, exchange_rate = $5, paid_by = $6, expense_date = $7, split_type = $8
       WHERE id = $9
       RETURNING id, group_id, description, amount, currency, exchange_rate, paid_by, expense_date, split_type, created_at`,
      [groupId, description, amount, currency, exchangeRate || 1.0, paidBy, expenseDate, splitType, id]
    );
    const expense = updateRes.rows[0];

    // 6. Refresh participant records (Delete existing and write updated ones)
    await client.query("DELETE FROM expense_participants WHERE expense_id = $1", [id]);

    const participantsList = [];
    for (const p of participants) {
      const epRes = await client.query(
        `INSERT INTO expense_participants (expense_id, user_id, share_value)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, share_value`,
        [id, p.userId, p.shareValue]
      );
      participantsList.push({
        userId: epRes.rows[0].user_id,
        shareValue: parseFloat(epRes.rows[0].share_value),
      });
    }

    await client.query("COMMIT");

    return {
      ...expense,
      expense_date: expense.expense_date ? expense.expense_date.toISOString().split("T")[0] : null,
      amount: parseFloat(expense.amount),
      exchange_rate: parseFloat(expense.exchange_rate),
      participants: participantsList,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Deletes an expense and its participant records in a transaction.
 */
async function deleteExpense(id) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Verify existence
    const checkRes = await client.query("SELECT id FROM expenses WHERE id = $1", [id]);
    if (checkRes.rows.length === 0) {
      throw { status: 404, message: `Expense with ID ${id} not found.` };
    }

    // 2. Delete splits
    await client.query("DELETE FROM expense_participants WHERE expense_id = $1", [id]);

    // 3. Delete expense
    await client.query("DELETE FROM expenses WHERE id = $1", [id]);

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Calculates net balances for all members of a group in the base currency (INR).
 */
async function getGroupBalances(groupId) {
  // 1. Verify group exists
  const groupRes = await pool.query("SELECT id FROM groups WHERE id = $1", [groupId]);
  if (groupRes.rows.length === 0) {
    throw { status: 404, message: `Group with ID ${groupId} does not exist.` };
  }

  // 2. Fetch all unique members of this group
  const membersRes = await pool.query(
    `SELECT DISTINCT u.id, u.name, u.email 
     FROM users u 
     JOIN group_members gm ON u.id = gm.user_id 
     WHERE gm.group_id = $1`,
    [groupId]
  );

  // 3. Query total amount paid by each user (converted to base currency using exchange_rate)
  const paidRes = await pool.query(
    `SELECT paid_by, SUM(amount * exchange_rate) as total_paid 
     FROM expenses 
     WHERE group_id = $1 
     GROUP BY paid_by`,
    [groupId]
  );
  const paidMap = {};
  for (const row of paidRes.rows) {
    paidMap[row.paid_by] = parseFloat(row.total_paid);
  }

  // 4. Query total amount owed by each user (converted to base currency using exchange_rate)
  const owesRes = await pool.query(
    `SELECT ep.user_id, SUM(ep.share_value * e.exchange_rate) as total_owes 
     FROM expense_participants ep 
     JOIN expenses e ON ep.expense_id = e.id 
     WHERE e.group_id = $1 
     GROUP BY ep.user_id`,
    [groupId]
  );
  const owesMap = {};
  for (const row of owesRes.rows) {
    owesMap[row.user_id] = parseFloat(row.total_owes);
  }

  // 5. Combine and calculate net balance
  const balances = membersRes.rows.map((m) => {
    const paid = paidMap[m.id] || 0.0;
    const owes = owesMap[m.id] || 0.0;
    return {
      userId: m.id,
      paid: Number(paid.toFixed(2)),
      owes: Number(owes.toFixed(2)),
      net: Number((paid - owes).toFixed(2)),
    };
  });

  return balances;
}

/**
 * Calculates the global net balance summary for a user across all groups.
 */
async function getUserBalanceSummary(userId) {
  // 1. Verify user exists
  const userRes = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
  if (userRes.rows.length === 0) {
    throw { status: 404, message: `User with ID ${userId} does not exist.` };
  }

  // 2. Query global total paid (converted using exchange rates)
  const paidRes = await pool.query(
    "SELECT COALESCE(SUM(amount * exchange_rate), 0) as total_paid FROM expenses WHERE paid_by = $1",
    [userId]
  );
  const totalPaid = parseFloat(paidRes.rows[0].total_paid);

  // 3. Query global total owes (converted using exchange rates)
  const owesRes = await pool.query(
    `SELECT COALESCE(SUM(ep.share_value * e.exchange_rate), 0) as total_owes 
     FROM expense_participants ep 
     JOIN expenses e ON ep.expense_id = e.id 
     WHERE ep.user_id = $1`,
    [userId]
  );
  const totalOwes = parseFloat(owesRes.rows[0].total_owes);

  return {
    userId,
    totalPaid: Number(totalPaid.toFixed(2)),
    totalOwes: Number(totalOwes.toFixed(2)),
    netBalance: Number((totalPaid - totalOwes).toFixed(2)),
  };
}

module.exports = {
  createExpense,
  getExpenseById,
  getExpensesForGroup,
  updateExpense,
  deleteExpense,
  getGroupBalances,
  getUserBalanceSummary,
};
