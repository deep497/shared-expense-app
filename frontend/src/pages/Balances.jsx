import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

export default function Balances() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBalances() {
      try {
        const groupDetails = await api.groups.getById(groupId);
        setGroup(groupDetails);

        const data = await api.balances.getGroupBalances(groupId);
        setBalances(data.balances);
      } catch (err) {
        console.error("Failed to load balances:", err);
        setError("Failed to fetch balance details for the group.");
      } finally {
        setLoading(false);
      }
    }
    loadBalances();
  }, [groupId]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <h3 style={{ color: "var(--text-muted)" }}>Calculating balances...</h3>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: "32px", gap: "20px", flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: "12px", color: "var(--accent-color)", fontWeight: "600", textTransform: "uppercase" }}>
            Group ID: {groupId} • {group?.name}
          </span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", marginTop: "4px" }}>Group Balances</h1>
          <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>Breakdown of how much everyone paid, owes, and net balances</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <Link to={`/groups/${groupId}`} className="btn btn-secondary" style={{ fontSize: "13px" }}>Group Info</Link>
          <Link to={`/groups/${groupId}/settlements`} className="btn btn-primary" style={{ fontSize: "13px" }}>Settlement Plan</Link>
        </div>
      </div>

      {error && (
        <div className="pill pill-danger" style={{ display: "block", width: "100%", padding: "12px", textAlign: "center", marginBottom: "24px" }}>
          {error}
        </div>
      )}

      {/* Grid of Balances for Quick Scannability */}
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>Net Balances Summary</h2>
      <div className="grid-container" style={{ marginBottom: "40px" }}>
        {balances.map((b) => {
          const userObj = group?.members.find((m) => m.userId === b.userId);
          const isPositive = b.net > 0.01;
          const isNegative = b.net < -0.01;

          return (
            <div
              key={b.userId}
              className={`glass-panel balance-card ${isPositive ? 'net-positive' : isNegative ? 'net-negative' : 'net-neutral'}`}
              style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: "600" }}>{userObj?.name || `User ID: ${b.userId}`}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>{userObj?.email}</p>
              
              <div className="val">
                {b.net > 0 ? "+" : ""}₹{b.net.toLocaleString("en-IN")}
              </div>

              <div style={{ display: "flex", justifyContent: "space-around", marginTop: "20px", paddingTop: "12px", borderTop: "1px solid var(--panel-border)" }}>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Paid</span>
                  <span style={{ fontSize: "14px", fontWeight: "600" }}>₹{b.paid.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Owes</span>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--warning-color)" }}>₹{b.owes.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table view */}
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>Detailed Ledger</h2>
      <div className="glass-panel" style={{ padding: "0", overflow: "hidden" }}>
        <table className="custom-table" style={{ marginTop: "0" }}>
          <thead>
            <tr>
              <th>User ID</th>
              <th>Member Name</th>
              <th>Total Paid</th>
              <th>Total Owes</th>
              <th>Net Balance</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => {
              const userObj = group?.members.find((m) => m.userId === b.userId);
              const isPositive = b.net > 0.01;
              const isNegative = b.net < -0.01;

              return (
                <tr key={b.userId}>
                  <td><strong>{b.userId}</strong></td>
                  <td>
                    <div>{userObj?.name || `User ID: ${b.userId}`}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{userObj?.email}</div>
                  </td>
                  <td style={{ color: "var(--text-main)" }}>₹{b.paid.toFixed(2)}</td>
                  <td style={{ color: "var(--warning-color)" }}>₹{b.owes.toFixed(2)}</td>
                  <td style={{ fontWeight: "700" }} className={isPositive ? "text-success" : isNegative ? "text-danger" : ""}>
                    {b.net > 0 ? "+" : ""}₹{b.net.toFixed(2)}
                  </td>
                  <td>
                    {isNegative ? (
                      <Link to={`/groups/${groupId}/settlements`} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>
                        Settle Debt
                      </Link>
                    ) : (
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Settle up</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
