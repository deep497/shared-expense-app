const expenseService = require("../services/expenseService");

// Helper to validate YYYY-MM-DD date format
function isValidDateString(dateStr) {
  if (!dateStr) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const dateObj = new Date(dateStr);
  return !isNaN(dateObj.getTime());
}

/**
 * Validates the expense payload format.
 */
function validateExpensePayload(body) {
  const {
    groupId,
    description,
    amount,
    currency,
    paidBy,
    expenseDate,
    splitType,
    participants,
  } = body;

  if (!groupId || isNaN(parseInt(groupId, 10))) {
    return "groupId must be a valid integer.";
  }
  if (!description || typeof description !== "string" || description.trim() === "") {
    return "description is required and must be a non-empty string.";
  }
  if (amount === undefined || isNaN(parseFloat(amount))) {
    return "amount is required and must be a valid number.";
  }
  if (!currency || typeof currency !== "string" || currency.trim() === "") {
    return "currency is required and must be a non-empty string.";
  }
  if (!paidBy || isNaN(parseInt(paidBy, 10))) {
    return "paidBy is required and must be a valid integer.";
  }
  if (!expenseDate || !isValidDateString(expenseDate)) {
    return "expenseDate is required and must be in YYYY-MM-DD format.";
  }
  if (!splitType || typeof splitType !== "string" || splitType.trim() === "") {
    return "splitType is required and must be a non-empty string.";
  }
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    return "participants must be a non-empty array.";
  }

  for (const p of participants) {
    if (!p.userId || isNaN(parseInt(p.userId, 10))) {
      return "Each participant must have a valid integer userId.";
    }
    if (p.shareValue === undefined || isNaN(parseFloat(p.shareValue))) {
      return "Each participant must have a valid numeric shareValue.";
    }
  }

  return null;
}

/**
 * POST /api/expenses
 */
async function createExpense(req, res) {
  const errorMsg = validateExpensePayload(req.body);
  if (errorMsg) {
    return res.status(400).json({ error: errorMsg });
  }

  try {
    const expense = await expenseService.createExpense({
      groupId: parseInt(req.body.groupId, 10),
      description: req.body.description.trim(),
      amount: parseFloat(req.body.amount),
      currency: req.body.currency.trim().toUpperCase(),
      exchangeRate: req.body.exchangeRate ? parseFloat(req.body.exchangeRate) : 1.0,
      paidBy: parseInt(req.body.paidBy, 10),
      expenseDate: req.body.expenseDate,
      splitType: req.body.splitType.trim().toUpperCase(),
      participants: req.body.participants.map((p) => ({
        userId: parseInt(p.userId, 10),
        shareValue: parseFloat(p.shareValue),
      })),
    });
    return res.status(201).json(expense);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Create Expense Error:", error);
    return res.status(500).json({ error: "Failed to create expense." });
  }
}

/**
 * GET /api/expenses/:id
 */
async function getExpenseById(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Expense ID must be a valid integer." });
  }

  try {
    const expense = await expenseService.getExpenseById(id);
    if (!expense) {
      return res.status(404).json({ error: `Expense with ID ${id} not found.` });
    }
    return res.status(200).json(expense);
  } catch (error) {
    console.error("Get Expense Error:", error);
    return res.status(500).json({ error: "Failed to retrieve expense." });
  }
}

/**
 * GET /api/groups/:groupId/expenses
 */
async function getExpensesForGroup(req, res) {
  const groupId = parseInt(req.params.groupId, 10);
  if (isNaN(groupId)) {
    return res.status(400).json({ error: "Group ID must be a valid integer." });
  }

  try {
    const expenses = await expenseService.getExpensesForGroup(groupId);
    return res.status(200).json(expenses);
  } catch (error) {
    console.error("Get Group Expenses Error:", error);
    return res.status(500).json({ error: "Failed to retrieve group expenses." });
  }
}

/**
 * PUT /api/expenses/:id
 */
async function updateExpense(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Expense ID must be a valid integer." });
  }

  const errorMsg = validateExpensePayload(req.body);
  if (errorMsg) {
    return res.status(400).json({ error: errorMsg });
  }

  try {
    const updatedExpense = await expenseService.updateExpense(id, {
      groupId: parseInt(req.body.groupId, 10),
      description: req.body.description.trim(),
      amount: parseFloat(req.body.amount),
      currency: req.body.currency.trim().toUpperCase(),
      exchangeRate: req.body.exchangeRate ? parseFloat(req.body.exchangeRate) : 1.0,
      paidBy: parseInt(req.body.paidBy, 10),
      expenseDate: req.body.expenseDate,
      splitType: req.body.splitType.trim().toUpperCase(),
      participants: req.body.participants.map((p) => ({
        userId: parseInt(p.userId, 10),
        shareValue: parseFloat(p.shareValue),
      })),
    });
    return res.status(200).json(updatedExpense);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Update Expense Error:", error);
    return res.status(500).json({ error: "Failed to update expense." });
  }
}

/**
 * DELETE /api/expenses/:id
 */
async function deleteExpense(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Expense ID must be a valid integer." });
  }

  try {
    await expenseService.deleteExpense(id);
    return res.status(200).json({ message: "Expense deleted successfully." });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Delete Expense Error:", error);
    return res.status(500).json({ error: "Failed to delete expense." });
  }
}

/**
 * GET /api/groups/:groupId/balances
 */
async function getGroupBalances(req, res) {
  const groupId = parseInt(req.params.groupId, 10);
  if (isNaN(groupId)) {
    return res.status(400).json({ error: "Group ID must be a valid integer." });
  }

  try {
    const balances = await expenseService.getGroupBalances(groupId);
    return res.status(200).json({
      groupId,
      balances,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Get Group Balances Error:", error);
    return res.status(500).json({ error: "Failed to calculate group balances." });
  }
}

/**
 * GET /api/users/:userId/balance
 */
async function getUserBalance(req, res) {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ error: "User ID must be a valid integer." });
  }

  try {
    const summary = await expenseService.getUserBalanceSummary(userId);
    return res.status(200).json(summary);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Get User Balance Error:", error);
    return res.status(500).json({ error: "Failed to calculate user balance summary." });
  }
}

module.exports = {
  createExpense,
  getExpenseById,
  getExpensesForGroup,
  updateExpense,
  deleteExpense,
  getGroupBalances,
  getUserBalance,
};
