import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

export default function Expenses() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [expenseId, setExpenseId] = useState(null); // Null for create, integer for edit
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [exchangeRate, setExchangeRate] = useState("1.0");
  const [paidBy, setPaidBy] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [splitType, setSplitType] = useState("EQUAL");
  
  // Participant inputs: { [userId]: { checked: boolean, value: string (percent or exact) } }
  const [participantInputs, setParticipantInputs] = useState({});

  const loadAllData = async () => {
    try {
      const groupDetails = await api.groups.getById(groupId);
      setGroup(groupDetails);

      const list = await api.expenses.getForGroup(groupId);
      setExpenses(list);

      // Initialize participants list
      if (groupDetails.members.length > 0) {
        const initialInputs = {};
        for (const m of groupDetails.members) {
          if (!m.leftAt) { // Default active members to checked
            initialInputs[m.userId] = { checked: true, value: "" };
          } else {
            initialInputs[m.userId] = { checked: false, value: "" };
          }
        }
        setParticipantInputs(initialInputs);
        setPaidBy(groupDetails.members.find(m => !m.leftAt)?.userId || "");
      }
    } catch (err) {
      console.error("Failed to load expenses data:", err);
      setError("Failed to fetch expenses or group members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [groupId]);

  // Handle currency defaults
  const handleCurrencyChange = (curr) => {
    setCurrency(curr);
    if (curr === "INR") setExchangeRate("1.0");
    else if (curr === "USD") setExchangeRate("83.0");
    else if (curr === "EUR") setExchangeRate("90.0");
    else if (curr === "GBP") setExchangeRate("105.0");
  };

  // Checkbox toggle
  const handleCheckboxChange = (userId) => {
    setParticipantInputs(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        checked: !prev[userId].checked
      }
    }));
  };

  // Value input (percent or exact)
  const handleValueChange = (userId, value) => {
    setParticipantInputs(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        value
      }
    }));
  };

  // Compute splits automatically for EQUAL
  const getCalculatedShares = () => {
    const totalAmt = parseFloat(amount) || 0;
    const activeParticipants = Object.keys(participantInputs).filter(
      (id) => participantInputs[id].checked
    );

    if (activeParticipants.length === 0) return [];

    if (splitType === "EQUAL") {
      const share = totalAmt / activeParticipants.length;
      return activeParticipants.map(id => ({
        userId: parseInt(id, 10),
        shareValue: parseFloat(share.toFixed(2)),
        displayValue: `₹${share.toFixed(2)}`
      }));
    } else if (splitType === "PERCENT") {
      return activeParticipants.map(id => {
        const pct = parseFloat(participantInputs[id].value) || 0;
        const share = totalAmt * (pct / 100);
        return ({
          userId: parseInt(id, 10),
          shareValue: parseFloat(share.toFixed(2)),
          displayValue: `${pct}% (₹${share.toFixed(2)})`
        });
      });
    } else { // EXACT
      return activeParticipants.map(id => {
        const val = parseFloat(participantInputs[id].value) || 0;
        return ({
          userId: parseInt(id, 10),
          shareValue: val,
          displayValue: `₹${val.toFixed(2)}`
        });
      });
    }
  };

  const handleEdit = (expense) => {
    setError("");
    setSuccess("");
    setExpenseId(expense.id);
    setDescription(expense.description);
    setAmount(expense.amount);
    setCurrency(expense.currency);
    setExchangeRate(expense.exchange_rate);
    setPaidBy(expense.paid_by);
    setExpenseDate(expense.expense_date);
    setSplitType(expense.split_type);

    // Populate participant checkboxes and inputs
    const updatedInputs = {};
    // Turn all off first
    if (group) {
      for (const m of group.members) {
        updatedInputs[m.userId] = { checked: false, value: "" };
      }
    }

    // Set active ones
    for (const p of expense.participants) {
      let rawVal = "";
      if (expense.split_type === "PERCENT") {
        const pct = (p.shareValue / expense.amount) * 100;
        rawVal = pct.toFixed(1);
      } else if (expense.split_type === "EXACT") {
        rawVal = p.shareValue.toString();
      }
      updatedInputs[p.userId] = { checked: true, value: rawVal };
    }
    setParticipantInputs(updatedInputs);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    setError("");
    setSuccess("");

    try {
      await api.expenses.delete(id);
      setSuccess("Expense deleted successfully!");
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete expense.");
    }
  };

  const handleResetForm = () => {
    setExpenseId(null);
    setDescription("");
    setAmount("");
    handleCurrencyChange("INR");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setSplitType("EQUAL");
    if (group && group.members.length > 0) {
      const initialInputs = {};
      for (const m of group.members) {
        initialInputs[m.userId] = { checked: !m.leftAt, value: "" };
      }
      setParticipantInputs(initialInputs);
      setPaidBy(group.members.find(m => !m.leftAt)?.userId || "");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const totalAmt = parseFloat(amount);
    if (isNaN(totalAmt) || totalAmt <= 0) {
      // Allow negative amounts for refunds as per Refactoring Requirement 7!
      // But we shouldn't allow zero
      if (totalAmt === 0) {
        setError("Expense amount cannot be zero.");
        return;
      }
    }

    const calculatedParticipants = getCalculatedShares();
    if (calculatedParticipants.length === 0) {
      setError("Please select at least one participant.");
      return;
    }

    // Double-check validation rules locally to give friendly alerts
    if (splitType === "PERCENT") {
      const sumPct = Object.keys(participantInputs)
        .filter(id => participantInputs[id].checked)
        .reduce((sum, id) => sum + (parseFloat(participantInputs[id].value) || 0), 0);
      if (Math.abs(sumPct - 100) > 0.1) {
        setError(`Percentages must sum to 100%. Current sum: ${sumPct}%`);
        return;
      }
    } else if (splitType === "EXACT") {
      const sumExact = Object.keys(participantInputs)
        .filter(id => participantInputs[id].checked)
        .reduce((sum, id) => sum + (parseFloat(participantInputs[id].value) || 0), 0);
      if (Math.abs(sumExact - totalAmt) > 0.05) {
        setError(`Exact share values must sum to the expense amount (${totalAmt}). Current sum: ${sumExact}`);
        return;
      }
    }

    const payload = {
      groupId: parseInt(groupId, 10),
      description: description.trim(),
      amount: totalAmt,
      currency,
      exchangeRate: parseFloat(exchangeRate),
      paidBy: parseInt(paidBy, 10),
      expenseDate,
      splitType,
      participants: calculatedParticipants.map(p => ({
        userId: p.userId,
        shareValue: p.shareValue
      }))
    };

    try {
      if (expenseId) {
        await api.expenses.update(expenseId, payload);
        setSuccess("Expense updated successfully!");
      } else {
        await api.expenses.create(payload);
        setSuccess("Expense created successfully!");
      }
      handleResetForm();
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit expense.");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <h3 style={{ color: "var(--text-muted)" }}>Loading expenses...</h3>
      </div>
    );
  }

  const calculatedShares = getCalculatedShares();

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <span style={{ fontSize: "12px", color: "var(--accent-color)", fontWeight: "600", textTransform: "uppercase" }}>
          Group ID: {groupId} • {group?.name}
        </span>
        <h1 style={{ fontSize: "32px", fontWeight: "700", marginTop: "4px" }}>Expense Management</h1>
        <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>Add, edit, or delete expenses and split bills</p>
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
        {/* Left Side: Create/Edit Form */}
        <div className="glass-panel" style={{ flex: "1 1 420px", height: "fit-content" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>
            {expenseId ? "Edit Expense" : "Add New Expense"}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Dinner, Uber ride"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            
            <div style={{ display: "flex", gap: "10px" }}>
              <div className="form-group" style={{ flex: "2" }}>
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="e.g. 1200"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: "1" }}>
                <label className="form-label">Currency</label>
                <select
                  className="form-control"
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            {currency !== "INR" && (
              <div className="form-group">
                <label className="form-label">Exchange Rate (1 {currency} = ? INR)</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <div className="form-group" style={{ flex: "1" }}>
                <label className="form-label">Paid By</label>
                <select
                  className="form-control"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  required
                >
                  {group?.members.map(m => (
                    <option key={m.userId} value={m.userId} disabled={!!m.leftAt}>
                      {m.name} {m.leftAt ? "(Left)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: "1" }}>
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Split Type</label>
              <select
                className="form-control"
                value={splitType}
                onChange={(e) => setSplitType(e.target.value)}
              >
                <option value="EQUAL">Split Equally</option>
                <option value="PERCENT">Split by Percentages</option>
                <option value="EXACT">Split by Exact Amounts</option>
              </select>
            </div>

            {/* Participants Checklist */}
            <div className="form-group">
              <label className="form-label">Split Participants</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "200px", overflowY: "auto", padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px" }}>
                {group?.members.map(m => {
                  const data = participantInputs[m.userId] || { checked: false, value: "" };
                  return (
                    <div key={m.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                        <input
                          type="checkbox"
                          checked={data.checked}
                          onChange={() => handleCheckboxChange(m.userId)}
                          disabled={!!m.leftAt && !data.checked} // Prevent adding left members, but allow editing existing
                        />
                        <span>{m.name}</span>
                      </label>
                      
                      {data.checked && splitType !== "EQUAL" && (
                        <input
                          type="number"
                          step="any"
                          style={{ width: "80px", padding: "4px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--panel-border)", color: "#fff", borderRadius: "4px" }}
                          placeholder={splitType === "PERCENT" ? "%" : "Amount"}
                          value={data.value}
                          onChange={(e) => handleValueChange(m.userId, e.target.value)}
                          required
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real-time split preview */}
            {calculatedShares.length > 0 && (
              <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--panel-border)", borderRadius: "8px", marginBottom: "20px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "8px", fontWeight: "600", textTransform: "uppercase" }}>Split Preview</span>
                {calculatedShares.map(p => {
                  const m = group?.members.find(x => x.userId === p.userId);
                  return (
                    <div key={p.userId} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginTop: "4px" }}>
                      <span>{m?.name}</span>
                      <strong style={{ color: "var(--accent-color)" }}>{p.displayValue}</strong>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              {expenseId && (
                <button type="button" onClick={handleResetForm} className="btn btn-secondary" style={{ flex: "1" }}>
                  Cancel Edit
                </button>
              )}
              <button type="submit" className="btn btn-primary" style={{ flex: "2" }}>
                {expenseId ? "Update Expense" : "Save Expense"}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Expenses History List */}
        <div style={{ flex: "2 1 600px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>Expenses History</h2>
          {expenses.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: "center", padding: "60px" }}>
              <p style={{ color: "var(--text-muted)" }}>No expenses recorded for this group yet.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {expenses.map((exp) => {
                const payerUser = group?.members.find(m => m.userId === exp.paid_by);
                const displayAmt = exp.currency !== "INR" 
                  ? `${exp.amount} ${exp.currency} (₹${(exp.amount * exp.exchange_rate).toFixed(2)})`
                  : `₹${exp.amount.toFixed(2)}`;

                return (
                  <div key={exp.id} className="glass-panel animate-fade-in" style={{ padding: "20px 24px" }}>
                    <div className="flex-between">
                      <div>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{exp.expense_date}</span>
                        <h3 style={{ fontSize: "18px", fontWeight: "600", marginTop: "4px" }}>{exp.description}</h3>
                        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "6px" }}>
                          Paid by: <strong>{payerUser?.name || `User ID: ${exp.paid_by}`}</strong> • Split Type: {exp.split_type}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "18px", fontWeight: "800", color: exp.amount < 0 ? "var(--success-color)" : "#fff" }}>
                          {displayAmt}
                        </div>
                        <div style={{ display: "flex", gap: "12px", marginTop: "12px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleEdit(exp)}
                            className="btn btn-secondary"
                            style={{ padding: "6px 12px", fontSize: "12px" }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="btn btn-danger"
                            style={{ padding: "6px 12px", fontSize: "12px" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Small list of splits */}
                    <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--panel-border)", display: "flex", flexWrap: "wrap", gap: "10px 20px" }}>
                      {exp.participants.map(p => {
                        const pm = group?.members.find(x => x.userId === p.userId);
                        return (
                          <div key={p.userId} style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            {pm?.name || `ID: ${p.userId}`}: <span style={{ color: "var(--text-light)" }}>₹{p.shareValue.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
