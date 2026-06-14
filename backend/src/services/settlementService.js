const pool = require("../db");
const expenseService = require("./expenseService");

/**
 * Records a settlement payment between two users.
 */
async function createSettlement(data) {
  const { payerId, receiverId, amount, paymentDate, notes } = data;

  if (parseInt(payerId, 10) === parseInt(receiverId, 10)) {
    throw { status: 400, message: "Payer and receiver cannot be the same user." };
  }
  if (parseFloat(amount) <= 0) {
    throw { status: 400, message: "Settlement amount must be greater than zero." };
  }

  // Check payer exists
  const payerRes = await pool.query("SELECT id FROM users WHERE id = $1", [payerId]);
  if (payerRes.rows.length === 0) {
    throw { status: 404, message: `Payer (User ID ${payerId}) does not exist.` };
  }

  // Check receiver exists
  const receiverRes = await pool.query("SELECT id FROM users WHERE id = $1", [receiverId]);
  if (receiverRes.rows.length === 0) {
    throw { status: 404, message: `Receiver (User ID ${receiverId}) does not exist.` };
  }

  const res = await pool.query(
    `INSERT INTO settlements (payer_id, receiver_id, amount, payment_date, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, payer_id, receiver_id, amount, payment_date, notes`,
    [payerId, receiverId, amount, paymentDate, notes || null]
  );

  const row = res.rows[0];
  return {
    id: row.id,
    payerId: row.payer_id,
    receiverId: row.receiver_id,
    amount: parseFloat(row.amount),
    paymentDate: row.payment_date ? row.payment_date.toISOString().split("T")[0] : null,
    notes: row.notes,
  };
}

/**
 * Retrieves the global history of settlements.
 */
async function getSettlements() {
  const res = await pool.query(
    `SELECT id, payer_id, receiver_id, amount, payment_date, notes 
     FROM settlements ORDER BY payment_date DESC, id DESC`
  );
  return res.rows.map((row) => ({
    id: row.id,
    payerId: row.payer_id,
    receiverId: row.receiver_id,
    amount: parseFloat(row.amount),
    paymentDate: row.payment_date ? row.payment_date.toISOString().split("T")[0] : null,
    notes: row.notes,
  }));
}

/**
 * Greedily simplifies debts to calculate the minimum number of transactions to resolve net balances.
 */
function simplifyDebts(balances) {
  const debtors = [];
  const creditors = [];

  for (const b of balances) {
    const net = parseFloat(b.net);
    if (net < -0.01) {
      debtors.push({ userId: b.userId, amount: -net });
    } else if (net > 0.01) {
      creditors.push({ userId: b.userId, amount: net });
    }
  }

  // Sort descending to settle largest amounts first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    transactions.push({
      fromUserId: debtor.userId,
      toUserId: creditor.userId,
      amount: Number(settleAmount.toFixed(2)),
    });

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) {
      dIdx++;
    }
    if (creditor.amount < 0.01) {
      cIdx++;
    }
  }

  return transactions;
}

/**
 * Fetches group balances and returns the simplified debts.
 */
async function getGroupSettlements(groupId) {
  const balances = await expenseService.getGroupBalances(groupId);
  const transactions = simplifyDebts(balances);

  // Retrieve user names to associate with IDs
  const usersRes = await pool.query("SELECT id, name FROM users");
  const userMap = {};
  for (const u of usersRes.rows) {
    userMap[u.id] = u.name;
  }

  return transactions.map((t) => ({
    fromUserId: t.fromUserId,
    from: userMap[t.fromUserId] || "Unknown",
    toUserId: t.toUserId,
    to: userMap[t.toUserId] || "Unknown",
    amount: t.amount,
  }));
}

module.exports = {
  createSettlement,
  getSettlements,
  getGroupSettlements,
};
