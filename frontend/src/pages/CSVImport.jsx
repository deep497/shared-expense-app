import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/api";

export default function CSVImport() {
  const [searchParams] = useSearchParams();
  const initialGroupId = searchParams.get("groupId") || "";

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const [file, setFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  useEffect(() => {
    async function loadGroups() {
      try {
        const list = await api.groups.getAll();
        setGroups(list);
        if (list.length > 0 && !selectedGroupId) {
          setSelectedGroupId(list[0].id.toString());
        }
      } catch (err) {
        console.error("Failed to load groups for import page:", err);
        setError("Failed to fetch groups list.");
      }
    }
    loadGroups();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setReport(null);

    if (!selectedGroupId) {
      setError("Please select a target group.");
      return;
    }
    if (!file) {
      setError("Please select a CSV file to upload.");
      return;
    }

    setLoading(true);

    try {
      const result = await api.csv.import(file, selectedGroupId);
      setReport(result);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details || "Failed to import CSV.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "700" }}>CSV Expense Import</h1>
        <p style={{ color: "var(--text-muted)", marginTop: "4px" }}>
          Upload an <code>expenses_export.csv</code> file to batch import expenses and check for anomalies
        </p>
      </div>

      <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", marginBottom: "40px" }}>
        {/* Left: Upload Panel */}
        <div className="glass-panel" style={{ flex: "1 1 350px", height: "fit-content" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>Upload Settings</h2>
          {error && (
            <div className="pill pill-danger" style={{ display: "block", width: "100%", padding: "10px", textAlign: "center", marginBottom: "16px" }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Target Group</label>
              <select
                className="form-control"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                required
              >
                <option value="">Select Target Group...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} (ID: {g.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">CSV File</label>
              <div style={{
                border: "2px dashed var(--panel-border)",
                borderRadius: "var(--border-radius-md)",
                padding: "20px",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.02)",
                cursor: "pointer",
                transition: "border var(--transition-speed)",
              }}
              onClick={() => document.getElementById("csvFilePicker").click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  setFile(e.dataTransfer.files[0]);
                }
              }}
              >
                <input
                  id="csvFilePicker"
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>📄</div>
                {file ? (
                  <div>
                    <strong style={{ color: "var(--accent-color)" }}>{file.name}</strong>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: "14px", color: "var(--text-light)" }}>Drag & drop or click to select CSV file</span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>Only .csv files allowed</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "10px" }}
              disabled={loading}
            >
              {loading ? "Processing CSV File..." : "Start Import"}
            </button>
          </form>
        </div>

        {/* Right: Informational Box / Summary */}
        <div style={{ flex: "2 1 450px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px" }}>Expected CSV Header Format</h2>
          <div className="glass-panel" style={{ padding: "20px", marginBottom: "24px" }}>
            <p style={{ color: "var(--text-light)", fontSize: "14px", lineHeight: "1.6" }}>
              To ensure a successful import, your CSV should use the following comma-separated headers:
            </p>
            <pre style={{
              background: "rgba(0, 0, 0, 0.3)",
              padding: "12px",
              borderRadius: "8px",
              marginTop: "12px",
              fontSize: "13px",
              color: "var(--accent-color)",
              overflowX: "auto",
              fontFamily: "monospace",
            }}>
              date,description,paid_by,amount,currency,split_type,split_with,split_details,notes
            </pre>
            <ul style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "16px", paddingLeft: "20px", lineHeight: "1.8" }}>
              <li><strong>date</strong>: YYYY-MM-DD formatted expense date.</li>
              <li><strong>paid_by</strong>: User name or email of the payer (must be a group member).</li>
              <li><strong>amount</strong>: Negative values are treated as refunds; positive are expenses.</li>
              <li><strong>split_with</strong>: Comma-separated names or emails. Defaults to all active group members.</li>
              <li><strong>split_details</strong>: Split values/shares (sum validated according to split_type).</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Import Report Panel */}
      {report && (
        <div className="glass-panel animate-fade-in" style={{ padding: "30px", marginBottom: "40px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "20px", borderBottom: "1px solid var(--panel-border)", paddingBottom: "12px" }}>
            Import Verification Report
          </h2>
          
          {/* Metrics grids */}
          <div className="grid-container" style={{ gap: "16px", marginBottom: "30px" }}>
            <div className="glass-panel balance-card net-neutral" style={{ padding: "16px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Total Rows</span>
              <div style={{ fontSize: "24px", fontWeight: "700", marginTop: "4px" }}>{report.totalRows}</div>
            </div>
            <div className="glass-panel balance-card net-positive" style={{ padding: "16px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Successfully Imported</span>
              <div style={{ fontSize: "24px", fontWeight: "700", marginTop: "4px", color: "var(--success-color)" }}>{report.validRows}</div>
            </div>
            <div className={`glass-panel balance-card ${report.anomaliesFound > 0 ? 'net-negative' : 'net-neutral'}`} style={{ padding: "16px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Anomalies Found</span>
              <div style={{ fontSize: "24px", fontWeight: "700", marginTop: "4px", color: report.anomaliesFound > 0 ? "var(--danger-color)" : "#fff" }}>
                {report.anomaliesFound}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
            {/* Actions list */}
            <div style={{ flex: "1 1 300px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>Actions Taken</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto", padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px" }}>
                {report.actionsTaken.map((action, idx) => {
                  const isSkip = action.includes("Skipped");
                  return (
                    <div key={idx} style={{ fontSize: "13px", padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.02)", display: "flex", gap: "8px" }}>
                      <span>{isSkip ? "❌" : "✅"}</span>
                      <span style={{ color: isSkip ? "var(--text-muted)" : "var(--text-main)" }}>{action}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Anomalies list details */}
            <div style={{ flex: "1.5 1 400px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>Anomaly Log Details</h3>
              {report.anomalies.length === 0 ? (
                <div style={{ padding: "20px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", color: "var(--success-color)", fontSize: "14px", textAlign: "center" }}>
                  No anomalies detected. All rows imported successfully!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "300px", overflowY: "auto" }}>
                  {report.anomalies.map((anom, idx) => (
                    <div key={idx} style={{
                      padding: "12px 16px",
                      background: anom.type === "ALIAS_DETECTED" ? "rgba(251, 113, 133, 0.08)" : "rgba(244, 63, 94, 0.05)",
                      borderLeft: `3px solid ${anom.type === "ALIAS_DETECTED" ? "var(--warning-color)" : "var(--danger-color)"}`,
                      borderRadius: "0 8px 8px 0",
                    }}>
                      <div className="flex-between">
                        <strong style={{ fontSize: "14px", color: "#fff" }}>Row {anom.row}: {anom.type}</strong>
                        <span className="pill pill-warning" style={{ fontSize: "11px" }}>{anom.action}</span>
                      </div>
                      <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "6px" }}>{anom.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ marginTop: "30px", display: "flex", justifyContent: "flex-end" }}>
            <Link to={`/groups/${selectedGroupId}`} className="btn btn-secondary">
              Go to Group Details
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
