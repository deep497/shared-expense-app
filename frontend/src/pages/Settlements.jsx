import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

export default function Settlements() {
  const { groupId } = useParams(); // May be empty if viewing history globally
  const [group, setGroup] = useState(null);
  const [simplifiedDebts, setSimplifiedDebts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Record Payment Form inputs
  const [payerId, setPayerId] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const loadData = async () => {
    try {
      if (groupId) {
        const groupDetails = await api.groups.getById(groupId);
        setGroup(groupDetails);

        const debts = await api.settlements.getGroupSettlements(groupId);
        setSimplifiedDebts(debts);
      }

      const settlementHistory = await api.settlements.getAll();
      setHistory(settlementHistory);
    } catch (err) {
      console.error("Failed to load settlements:", err);
      setError("Failed to fetch settlements details or history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  const handlePrefillPayment = (debt) => {
    setPayerId(debt.fromUserId);
    setReceiverId(debt.toUserId);
    setAmount(debt.amount);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!payerId || !receiverId || !amount || !paymentDate) {
      setError("Please fill out all required fields.");
      return;
    }

    try {
      await api.settlements.create({
        payerId: parseInt(payerId, 10),
        receiverId: parseInt(receiverId, 10),
        amount: parseFloat(amount),
        paymentDate,
        notes: notes.trim(),
      });
      setSuccess("Payment recorded successfully!");
      setAmount("");
      setNotes("");
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record payment.");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <h3 style={{ color: "var(--text-muted)" }}>Loading settlements...</h3>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: "32px", gap: "20px", flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: "12px", color: "var(--accent-color)", fontWeight: "600", textTransform: "uppercase" }}>
            Settlement Engine
          </span>
          <h1 style={{ fontSize: "32px", fontWeight: "700", marginTop: "4px" }}>
            {group ? `Settlements: ${group.name}` : "Settlement Dashboard"}
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>
            {group ? "Simplified debt schedule and record payments" : "Global transaction history of all settlements"}
          </p>
        </div>
        {group && (
          <div style={{ display: "flex", gap: "12px" }}>
            <Link to={`/groups/${groupId}`} className="btn btn-secondary" style={{ fontSize: "13px" }}>Group Info</Link>
            <Link to={`/groups/${groupId}/balances`} className="btn btn-secondary" style={{ fontSize: "13px" }}>Balances</Link>
          </div>
        )}
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

      <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", marginBottom: "40px" }}>
        {/* Left: Debt simplification (only if in group context) */}
        {group && (
          <div style={{ flex: "2 1 450px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>Simplified Debt Plan</h2>
            {simplifiedDebts.length === 0 ? (
              <div className="glass-panel animate-fade-in" style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>🎉</div>
                <p style={{ color: "var(--success-color)", fontWeight: "600" }}>All settled up!</p>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>Nobody owes anything in this group.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {simplifiedDebts.map((debt, idx) => (
                  <div key={idx} className="glass-panel flex-between animate-fade-in" style={{ padding: "20px 24px" }}>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: "600", color: "#fff" }}>
                        <span style={{ color: "var(--warning-color)", fontWeight: "700" }}>{debt.from}</span> pays{" "}
                        <span style={{ color: "var(--success-color)", fontWeight: "700" }}>{debt.to}</span>
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
                        Debtor ID: {debt.fromUserId} • Creditor ID: {debt.toUserId}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                      <span style={{ fontSize: "20px", fontWeight: "800", color: "var(--danger-color)" }}>
                        ₹{debt.amount.toLocaleString("en-IN")}
                      </span>
                      <button
                        onClick={() => handlePrefillPayment(debt)}
                        className="btn btn-primary"
                        style={{ padding: "8px 16px", fontSize: "13px" }}
                      >
                        Record Payment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Right: Record Settlement Payment Form */}
        <div className="glass-panel" style={{ flex: "1 1 350px", height: "fit-content" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>Record Actual Settlement</h2>
          <form onSubmit={handleRecordPayment}>
            <div className="form-group">
              <label className="form-label">Who Paid (Payer)</label>
              {group ? (
                <select
                  className="form-control"
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  required
                >
                  <option value="">Select Payer...</option>
                  {group.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} (ID: {m.userId})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  className="form-control"
                  placeholder="Enter Payer User ID"
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  required
                />
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Who Received (Receiver)</label>
              {group ? (
                <select
                  className="form-control"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  required
                >
                  <option value="">Select Receiver...</option>
                  {group.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} (ID: {m.userId})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  className="form-control"
                  placeholder="Enter Receiver User ID"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  required
                />
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <div className="form-group" style={{ flex: "1.5" }}>
                <label className="form-label">Amount Paid</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="e.g. 1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: "1" }}>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Rent share, Cash transfer"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>
              Record Settlement Payment
            </button>
          </form>
        </div>
      </div>

      {/* Global Settlement Ledger */}
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>Recorded Settlement History</h2>
      {history.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "var(--text-muted)" }}>No settlements have been recorded yet.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: "0", overflow: "hidden" }}>
          <table className="custom-table" style={{ marginTop: "0" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Payer ID</th>
                <th>Receiver ID</th>
                <th>Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.id}</strong></td>
                  <td>{row.paymentDate}</td>
                  <td>User {row.payerId}</td>
                  <td>User {row.receiverId}</td>
                  <td style={{ color: "var(--success-color)", fontWeight: "700" }}>
                    ₹{row.amount.toLocaleString("en-IN")}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontStyle: row.notes ? "normal" : "italic" }}>
                    {row.notes || "None"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
