const groupService = require("../services/groupService");

// Helper to validate YYYY-MM-DD date format
function isValidDateString(dateStr) {
  if (!dateStr) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const dateObj = new Date(dateStr);
  return !isNaN(dateObj.getTime());
}

/**
 * POST /api/groups
 */
async function createGroup(req, res) {
  const { name } = req.body;
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Group name is required and must be a non-empty string." });
  }

  try {
    const group = await groupService.createGroup(name.trim());
    return res.status(201).json({
      id: group.id,
      name: group.name,
    });
  } catch (error) {
    console.error("Create Group Error:", error);
    return res.status(500).json({ error: "Failed to create group." });
  }
}

/**
 * GET /api/groups
 */
async function getAllGroups(req, res) {
  try {
    const groups = await groupService.getAllGroups();
    return res.status(200).json(groups);
  } catch (error) {
    console.error("Get All Groups Error:", error);
    return res.status(500).json({ error: "Failed to fetch groups." });
  }
}

/**
 * GET /api/groups/:id
 */
async function getGroupById(req, res) {
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) {
    return res.status(400).json({ error: "Group ID must be a valid integer." });
  }

  try {
    const group = await groupService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ error: `Group with ID ${groupId} not found.` });
    }
    return res.status(200).json(group);
  } catch (error) {
    console.error("Get Group By ID Error:", error);
    return res.status(500).json({ error: "Failed to fetch group details." });
  }
}

/**
 * POST /api/groups/:groupId/members
 */
async function addMemberToGroup(req, res) {
  const groupId = parseInt(req.params.groupId, 10);
  const { userId, joinedAt } = req.body;

  if (isNaN(groupId)) {
    return res.status(400).json({ error: "Group ID in path must be a valid integer." });
  }
  if (!userId || isNaN(parseInt(userId, 10))) {
    return res.status(400).json({ error: "userId is required and must be a valid integer." });
  }
  if (!joinedAt || !isValidDateString(joinedAt)) {
    return res.status(400).json({ error: "joinedAt is required and must be a valid date in YYYY-MM-DD format." });
  }

  try {
    const membership = await groupService.addMemberToGroup(groupId, parseInt(userId, 10), joinedAt);
    return res.status(201).json(membership);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Add Group Member Error:", error);
    return res.status(500).json({ error: "Failed to add member to group." });
  }
}

/**
 * PATCH /api/groups/:groupId/members/:userId
 */
async function removeMemberFromGroup(req, res) {
  const groupId = parseInt(req.params.groupId, 10);
  const userId = parseInt(req.params.userId, 10);
  const { leftAt } = req.body;

  if (isNaN(groupId)) {
    return res.status(400).json({ error: "Group ID in path must be a valid integer." });
  }
  if (isNaN(userId)) {
    return res.status(400).json({ error: "User ID in path must be a valid integer." });
  }
  if (!leftAt || !isValidDateString(leftAt)) {
    return res.status(400).json({ error: "leftAt is required and must be a valid date in YYYY-MM-DD format." });
  }

  try {
    const updatedMembership = await groupService.removeMemberFromGroup(groupId, userId, leftAt);
    return res.status(200).json({
      message: "Member removed successfully",
      membership: updatedMembership,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Remove Group Member Error:", error);
    return res.status(500).json({ error: "Failed to remove member from group." });
  }
}

module.exports = {
  createGroup,
  getAllGroups,
  getGroupById,
  addMemberToGroup,
  removeMemberFromGroup,
};
