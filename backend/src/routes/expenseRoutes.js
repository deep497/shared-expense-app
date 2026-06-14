const express = require("express");
const expenseController = require("../controllers/expenseController");

const router = express.Router();

// CRUD operations on Expenses
router.post("/expenses", expenseController.createExpense);
router.get("/expenses/:id", expenseController.getExpenseById);
router.put("/expenses/:id", expenseController.updateExpense);
router.delete("/expenses/:id", expenseController.deleteExpense);

// Retreive Expenses for a Group
router.get("/groups/:groupId/expenses", expenseController.getExpensesForGroup);

// Balance calculation endpoints
router.get("/groups/:groupId/balances", expenseController.getGroupBalances);
router.get("/users/:userId/balance", expenseController.getUserBalance);

module.exports = router;
