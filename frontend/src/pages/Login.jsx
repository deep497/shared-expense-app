import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.auth.login(email, password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials.");
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
          <h2 style={{ fontSize: "28px", fontWeight: "700" }}>Welcome Back</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>Enter details to log in to EquiShare</p>
        </div>

        {error && (
          <div className="pill pill-danger" style={{ width: "100%", padding: "12px", borderRadius: "8px", marginBottom: "20px", display: "block", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
            <label className="form-label">Password</label>
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
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p style={{ marginTop: "24px", textAlign: "center", fontSize: "14px", color: "var(--text-muted)" }}>
          Don't have an account? <Link to="/register" style={{ color: "var(--accent-color)", fontWeight: "600" }}>Register here</Link>
        </p>
      </div>
    </div>
  );
}
