const pool = require("../db");

/**
 * Creates a new group.
 * @param {string} name - Name of the group.
 * @returns {Promise<object>} Created group object.
 */
async function createGroup(name) {
  const res = await pool.query(
    "INSERT INTO groups (name) VALUES ($1) RETURNING id, name, created_at",
    [name]
  );
  return res.rows[0];
}

/**
 * Gets all groups in the system.
 * @returns {Promise<Array>} Array of group objects.
 */
async function getAllGroups() {
  const res = await pool.query(
    "SELECT id, name, created_at FROM groups ORDER BY id"
  );
  return res.rows;
}

/**
 * Gets a group by its ID, including member information.
 * @param {number} id - Group ID.
 * @returns {Promise<object|null>} Group details with members array, or null if not found.
 */
async function getGroupById(id) {
  const groupRes = await pool.query(
    "SELECT id, name, created_at FROM groups WHERE id = $1",
    [id]
  );
  if (groupRes.rows.length === 0) {
    return null;
  }

  const membersRes = await pool.query(
    `SELECT gm.user_id, u.name, u.email, gm.joined_at, gm.left_at 
     FROM group_members gm 
     JOIN users u ON gm.user_id = u.id 
     WHERE gm.group_id = $1 
     ORDER BY gm.joined_at`,
    [id]
  );

  return {
    ...groupRes.rows[0],
    members: membersRes.rows.map((m) => ({
      userId: m.user_id,
      name: m.name,
      email: m.email,
      joinedAt: m.joined_at ? m.joined_at.toISOString().split("T")[0] : null,
      leftAt: m.left_at ? m.left_at.toISOString().split("T")[0] : null,
    })),
  };
}

/**
 * Adds a user to a group, validating membership constraints.
 * @param {number} groupId - Target group ID.
 * @param {number} userId - Target user ID.
 * @param {string} joinedAt - Date string (YYYY-MM-DD) representing membership start.
 * @returns {Promise<object>} Created group_members record.
 */
async function addMemberToGroup(groupId, userId, joinedAt) {
  // 1. Verify group exists
  const groupRes = await pool.query("SELECT id FROM groups WHERE id = $1", [groupId]);
  if (groupRes.rows.length === 0) {
    throw { status: 404, message: `Group with ID ${groupId} does not exist.` };
  }

  // 2. Verify user exists
  const userRes = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
  if (userRes.rows.length === 0) {
    throw { status: 404, message: `User with ID ${userId} does not exist.` };
  }

  // 3. Verify user is not already an active member of this group
  const activeRes = await pool.query(
    "SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2 AND left_at IS NULL",
    [groupId, userId]
  );
  if (activeRes.rows.length > 0) {
    throw { status: 400, message: "User is already an active member of this group." };
  }

  // 4. If rejoining, check that new joinedAt is >= the last leftAt
  const historyRes = await pool.query(
    "SELECT MAX(left_at) as last_left FROM group_members WHERE group_id = $1 AND user_id = $2",
    [groupId, userId]
  );
  if (historyRes.rows[0].last_left) {
    const lastLeft = new Date(historyRes.rows[0].last_left);
    const newJoined = new Date(joinedAt);
    if (newJoined < lastLeft) {
      const formattedLastLeft = lastLeft.toISOString().split("T")[0];
      throw {
        status: 400,
        message: `New join date (${joinedAt}) must be after or equal to the last leave date (${formattedLastLeft}).`,
      };
    }
  }

  // 5. Insert new active membership
  const insertRes = await pool.query(
    "INSERT INTO group_members (group_id, user_id, joined_at) VALUES ($1, $2, $3) RETURNING id, group_id, user_id, joined_at, left_at",
    [groupId, userId, joinedAt]
  );

  const row = insertRes.rows[0];
  return {
    id: row.id,
    group_id: row.group_id,
    user_id: row.user_id,
    joined_at: row.joined_at ? row.joined_at.toISOString().split("T")[0] : null,
    left_at: row.left_at ? row.left_at.toISOString().split("T")[0] : null,
  };
}

/**
 * Removes a member from a group (sets left_at on the active membership).
 * @param {number} groupId - Target group ID.
 * @param {number} userId - Target user ID.
 * @param {string} leftAt - Date string (YYYY-MM-DD) representing membership end.
 * @returns {Promise<object>} Updated group_members record.
 */
async function removeMemberFromGroup(groupId, userId, leftAt) {
  // 1. Locate current active membership
  const activeRes = await pool.query(
    "SELECT id, joined_at FROM group_members WHERE group_id = $1 AND user_id = $2 AND left_at IS NULL",
    [groupId, userId]
  );
  if (activeRes.rows.length === 0) {
    throw { status: 404, message: "No active membership found for this user in the specified group." };
  }

  const activeId = activeRes.rows[0].id;
  const joinedAt = new Date(activeRes.rows[0].joined_at);
  const leftAtDate = new Date(leftAt);

  // 2. Validate leave date is not before join date
  if (leftAtDate < joinedAt) {
    const formattedJoinedAt = joinedAt.toISOString().split("T")[0];
    throw {
      status: 400,
      message: `Leave date (${leftAt}) cannot be before the join date (${formattedJoinedAt}).`,
    };
  }

  // 3. Update active membership record
  const updateRes = await pool.query(
    "UPDATE group_members SET left_at = $1 WHERE id = $2 RETURNING id, group_id, user_id, joined_at, left_at",
    [leftAt, activeId]
  );

  const row = updateRes.rows[0];
  return {
    id: row.id,
    group_id: row.group_id,
    user_id: row.user_id,
    joined_at: row.joined_at ? row.joined_at.toISOString().split("T")[0] : null,
    left_at: row.left_at ? row.left_at.toISOString().split("T")[0] : null,
  };
}

module.exports = {
  createGroup,
  getAllGroups,
  getGroupById,
  addMemberToGroup,
  removeMemberFromGroup,
};
