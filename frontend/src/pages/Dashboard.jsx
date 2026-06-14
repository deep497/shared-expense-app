import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [balance, setBalance] = useState({ totalPaid: 0, totalOwes: 0, netBalance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    async function loadData() {
      try {
        const groupsList = await api.groups.getAll();
        setGroups(groupsList);
        
        if (user.id) {
          const userBalance = await api.balances.getUserBalance(user.id);
          setBalance(userBalance);
        }
      } catch (err) {
        console.error("Dashboard load failed:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user.id]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <h3 style={{ color: "var(--text-muted)" }}>Loading dashboard...</h3>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "700" }}>Dashboard</h1>
          <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>Overview of your shared expenses across groups</p>
        </div>
        <Link to="/groups" className="btn btn-primary">Manage Groups</Link>
      </div>

      {error && (
        <div className="pill pill-danger" style={{ display: "block", width: "100%", padding: "12px", textAlign: "center", marginBottom: "24px" }}>
          {error}
        </div>
      )}

      {/* Global Balance Overview */}
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>Global Balance Overview</h2>
      <div className="grid-container" style={{ marginBottom: "40px" }}>
        <div className="glass-panel balance-card net-neutral">
          <p style={{ color: "var(--text-muted)", fontSize: "14px", fontWeight: "500" }}>Total Paid</p>
          <div className="val">₹{balance.totalPaid.toLocaleString("en-IN")}</div>
        </div>
        <div className="glass-panel balance-card net-neutral">
          <p style={{ color: "var(--text-muted)", fontSize: "14px", fontWeight: "500" }}>Total Owed</p>
          <div className="val" style={{ color: "var(--warning-color)" }}>₹{balance.totalOwes.toLocaleString("en-IN")}</div>
        </div>
        <div className={`glass-panel balance-card ${balance.netBalance > 0.01 ? 'net-positive' : balance.netBalance < -0.01 ? 'net-negative' : 'net-neutral'}`}>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", fontWeight: "500" }}>Net Balance</p>
          <div className="val">
            {balance.netBalance > 0 ? "+" : ""}₹{balance.netBalance.toLocaleString("en-IN")}
          </div>
          <p style={{ fontSize: "12px", marginTop: "8px", color: "var(--text-muted)" }}>
            {balance.netBalance > 0.01 
              ? "You are owed money overall" 
              : balance.netBalance < -0.01 
              ? "You owe money overall" 
              : "All settled up!"}
          </p>
        </div>
      </div>

      {/* Groups List */}
      <div className="flex-between" style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600" }}>Your Groups</h2>
        <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>{groups.length} Groups found</span>
      </div>

      {groups.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ color: "var(--text-muted)", marginBottom: "20px", fontSize: "15px" }}>You are not a member of any group yet.</p>
          <Link to="/groups" className="btn btn-secondary">Create or Join a Group</Link>
        </div>
      ) : (
        <div className="grid-container">
          {groups.map((group) => (
            <div key={group.id} className="glass-panel" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "180px" }}>
              <div>
                <h3 style={{ fontSize: "20px", marginBottom: "8px", fontWeight: "600" }}>{group.name}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                  Created: {new Date(group.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex-between" style={{ marginTop: "20px" }}>
                <Link to={`/groups/${group.id}`} className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "13px" }}>View Details</Link>
                <Link to={`/import?groupId=${group.id}`} className="nav-link" style={{ fontSize: "13px", fontWeight: "600" }}>Import CSV</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
