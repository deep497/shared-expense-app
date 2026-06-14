const express = require("express");
const groupController = require("../controllers/groupController");

const router = express.Router();

// Group routes
router.post("/groups", groupController.createGroup);
router.get("/groups", groupController.getAllGroups);
router.get("/groups/:id", groupController.getGroupById);

// Member relationship routes
router.post("/groups/:groupId/members", groupController.addMemberToGroup);
router.patch("/groups/:groupId/members/:userId", groupController.removeMemberFromGroup);

module.exports = router;
