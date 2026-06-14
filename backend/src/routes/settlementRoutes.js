const express = require("express");
const settlementController = require("../controllers/settlementController");

const router = express.Router();

// Settlement routes
router.post("/settlements", settlementController.createSettlement);
router.get("/settlements", settlementController.getSettlements);
router.get("/groups/:groupId/settlements", settlementController.getGroupSettlements);

module.exports = router;
