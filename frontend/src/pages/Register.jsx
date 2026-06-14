import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.auth.register(name, email, password);
      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to register.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "20px"
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            background: "var(--primary-gradient)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "800",
            color: "#fff",
            fontSize: "24px",
            marginBottom: "12px"
          }}>E</div>
          <h2 style={{ fontSize: "28px", fontWeight: "700" }}>Get Started</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>Create your account to start splitting expenses</p>
        </div>

        {error && (
          <div className="pill pill-danger" style={{ width: "100%", padding: "12px", borderRadius: "8px", marginBottom: "20px", display: "block", textAlign: "center" }}>
            {error}
          </div>
        )}

        {success && (
          <div className="pill pill-success" style={{ width: "100%", padding: "12px", borderRadius: "8px", marginBottom: "20px", display: "block", textAlign: "center" }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Aisha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password (Min 6 characters)</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "10px" }}
            disabled={loading}
          >
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>

        <p style={{ marginTop: "24px", textAlign: "center", fontSize: "14px", color: "var(--text-muted)" }}>
          Already have an account? <Link to="/login" style={{ color: "var(--accent-color)", fontWeight: "600" }}>Log in here</Link>
        </p>
      </div>
    </div>
  );
}
