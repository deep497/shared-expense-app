import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const loadGroups = async () => {
    try {
      const list = await api.groups.getAll();
      setGroups(list);
    } catch (err) {
      console.error("Load groups failed:", err);
      setError("Failed to fetch groups list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) return;

    try {
      await api.groups.create(name.trim());
      setSuccess("Group created successfully!");
      setName("");
      loadGroups();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create group.");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <h3 style={{ color: "var(--text-muted)" }}>Loading groups...</h3>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Group Management</h1>
        <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>Organize your flatmates, trips, and friends</p>
      </div>

      <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
        {/* Left Side: Create Group Form */}
        <div className="glass-panel" style={{ flex: "1 1 350px", height: "fit-content" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>Create New Group</h2>
          {error && (
            <div className="pill pill-danger" style={{ display: "block", width: "100%", padding: "10px", textAlign: "center", marginBottom: "16px" }}>
              {error}
            </div>
          )}
          {success && (
            <div className="pill pill-success" style={{ display: "block", width: "100%", padding: "10px", textAlign: "center", marginBottom: "16px" }}>
              {success}
            </div>
          )}
          <form onSubmit={handleCreateGroup}>
            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Flatmates, Road Trip 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>
              Create Group
            </button>
          </form>
        </div>

        {/* Right Side: Groups List */}
        <div style={{ flex: "2 1 500px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>Existing Groups</h2>
          {groups.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: "center", padding: "40px" }}>
              <p style={{ color: "var(--text-muted)" }}>No groups found. Create one to get started!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {groups.map((group) => (
                <div key={group.id} className="glass-panel flex-between" style={{ padding: "20px 24px" }}>
                  <div>
                    <h3 style={{ fontSize: "18px", fontWeight: "600" }}>{group.name}</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
                      Group ID: {group.id} • Created: {new Date(group.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link to={`/groups/${group.id}`} className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "13px" }}>
                    Manage Members & Expenses
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
