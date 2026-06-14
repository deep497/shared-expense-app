import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

export default function GroupDetails() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add member inputs
  const [newUserId, setNewUserId] = useState("");
  const [joinedAt, setJoinedAt] = useState(new Date().toISOString().split("T")[0]);

  // Remove member inputs
  const [removingUser, setRemovingUser] = useState(null);
  const [leftAt, setLeftAt] = useState(new Date().toISOString().split("T")[0]);

  const loadGroupDetails = async () => {
    try {
      const details = await api.groups.getById(id);
      setGroup(details);
    } catch (err) {
      console.error("Failed to load group details:", err);
      setError("Failed to fetch group details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupDetails();
  }, [id]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newUserId) return;

    try {
      await api.groups.addMember(id, newUserId, joinedAt);
      setSuccess("Member added successfully!");
      setNewUserId("");
      loadGroupDetails();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add member.");
    }
  };

  const handleRemoveMember = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!removingUser) return;

    try {
      await api.groups.removeMember(id, removingUser.userId, leftAt);
      setSuccess(`Member ${removingUser.name} removed successfully!`);
      setRemovingUser(null);
      loadGroupDetails();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove member.");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <h3 style={{ color: "var(--text-muted)" }}>Loading group details...</h3>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="glass-panel" style={{ textAlign: "center", padding: "40px" }}>
        <h3 style={{ color: "var(--danger-color)" }}>Group not found.</h3>
        <Link to="/groups" className="btn btn-secondary" style={{ marginTop: "20px" }}>Back to Groups</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header and Quick Links */}
      <div className="flex-between" style={{ marginBottom: "32px", gap: "20px", flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: "12px", color: "var(--accent-color)", fontWeight: "600", textTransform: "uppercase" }}>Group Details</span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", marginTop: "4px" }}>{group.name}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Group ID: {group.id} • Created on: {new Date(group.created_at).toLocaleDateString()}</p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link to={`/groups/${id}/expenses`} className="btn btn-secondary" style={{ fontSize: "13px" }}>View Expenses</Link>
          <Link to={`/groups/${id}/balances`} className="btn btn-secondary" style={{ fontSize: "13px" }}>Calculate Balances</Link>
          <Link to={`/groups/${id}/settlements`} className="btn btn-primary" style={{ fontSize: "13px" }}>Settlement Plan</Link>
        </div>
      </div>

      {error && (
        <div className="pill pill-danger" style={{ display: "block", width: "100%", padding: "12px", textAlign: "center", marginBottom: "24px" }}>
          {error}
        </div>
      )}
      {success && (
        <div className="pill pill-success" style={{ display: "block", width: "100%", padding: "12px", textAlign: "center", marginBottom: "24px" }}>
          {success}
        </div>
      )}

      <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
        {/* Left Side: Members List */}
        <div style={{ flex: "2 1 500px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>Members</h2>
          {group.members.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: "center", padding: "40px" }}>
              <p style={{ color: "var(--text-muted)" }}>No members found. Add members to split expenses.</p>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: "0", overflow: "hidden" }}>
              <table className="custom-table" style={{ marginTop: "0" }}>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Joined At</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {group.members.map((member, index) => {
                    const isActive = !member.leftAt;
                    return (
                      <tr key={index}>
                        <td><strong>{member.userId}</strong></td>
                        <td>{member.name}</td>
                        <td style={{ color: "var(--text-muted)" }}>{member.email}</td>
                        <td>{member.joinedAt}</td>
                        <td>
                          {isActive ? (
                            <span className="pill pill-success">Active</span>
                          ) : (
                            <span className="pill pill-danger" title={`Left on ${member.leftAt}`}>Left ({member.leftAt})</span>
                          )}
                        </td>
                        <td>
                          {isActive ? (
                            <button
                              onClick={() => setRemovingUser(member)}
                              className="btn btn-danger"
                              style={{ padding: "6px 12px", fontSize: "12px" }}
                            >
                              Remove
                            </button>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Left</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Operations Panel */}
        <div style={{ flex: "1 1 350px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Add Member Form */}
          <div className="glass-panel">
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>Add Member</h2>
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label className="form-label">User ID</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 5"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Join Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={joinedAt}
                  onChange={(e) => setJoinedAt(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                Add to Group
              </button>
            </form>
          </div>

          {/* Remove Member Date Input Form (displays only when a member is selected to remove) */}
          {removingUser && (
            <div className="glass-panel" style={{ border: "1px solid var(--danger-color)" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px", color: "var(--danger-color)" }}>Confirm Leave</h2>
              <p style={{ color: "var(--text-light)", fontSize: "14px", marginBottom: "16px" }}>
                Select leave date for <strong>{removingUser.name}</strong> (ID: {removingUser.userId}):
              </p>
              <form onSubmit={handleRemoveMember}>
                <div className="form-group">
                  <label className="form-label">Leave Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={leftAt}
                    onChange={(e) => setLeftAt(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={() => setRemovingUser(null)} className="btn btn-secondary" style={{ flex: "1" }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger" style={{ flex: "1" }}>
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
