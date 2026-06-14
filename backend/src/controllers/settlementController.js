const settlementService = require("../services/settlementService");

// Helper to validate YYYY-MM-DD date format
function isValidDateString(dateStr) {
  if (!dateStr) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const dateObj = new Date(dateStr);
  return !isNaN(dateObj.getTime());
}

/**
 * POST /api/settlements
 */
async function createSettlement(req, res) {
  const { payerId, receiverId, amount, paymentDate, notes } = req.body;

  if (!payerId || isNaN(parseInt(payerId, 10))) {
    return res.status(400).json({ error: "payerId is required and must be a valid integer." });
  }
  if (!receiverId || isNaN(parseInt(receiverId, 10))) {
    return res.status(400).json({ error: "receiverId is required and must be a valid integer." });
  }
  if (amount === undefined || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "amount is required and must be a number greater than 0." });
  }
  if (!paymentDate || !isValidDateString(paymentDate)) {
    return res.status(400).json({ error: "paymentDate is required and must be in YYYY-MM-DD format." });
  }

  try {
    const settlement = await settlementService.createSettlement({
      payerId: parseInt(payerId, 10),
      receiverId: parseInt(receiverId, 10),
      amount: parseFloat(amount),
      paymentDate,
      notes: notes ? String(notes).trim() : null,
    });
    return res.status(201).json(settlement);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Create Settlement Error:", error);
    return res.status(500).json({ error: "Failed to record settlement." });
  }
}

/**
 * GET /api/settlements
 */
async function getSettlements(req, res) {
  try {
    const settlements = await settlementService.getSettlements();
    return res.status(200).json(settlements);
  } catch (error) {
    console.error("Get Settlements Error:", error);
    return res.status(500).json({ error: "Failed to fetch settlement history." });
  }
}

/**
 * GET /api/groups/:groupId/settlements
 */
async function getGroupSettlements(req, res) {
  const groupId = parseInt(req.params.groupId, 10);
  if (isNaN(groupId)) {
    return res.status(400).json({ error: "groupId must be a valid integer." });
  }

  try {
    const transactions = await settlementService.getGroupSettlements(groupId);
    return res.status(200).json(transactions);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Get Group Settlements Error:", error);
    return res.status(500).json({ error: "Failed to calculate group debt settlements." });
  }
}

module.exports = {
  createSettlement,
  getSettlements,
  getGroupSettlements,
};
