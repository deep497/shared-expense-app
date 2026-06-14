import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const userJson = localStorage.getItem("user");
  const user = userJson ? JSON.parse(userJson) : null;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  return (
    <nav className="navbar animate-fade-in">
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: "var(--primary-gradient)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "800",
          color: "#fff",
          fontSize: "18px"
        }}>E</div>
        <span style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "-0.5px" }}>EquiShare</span>
      </Link>
      <div className="nav-links">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Dashboard</NavLink>
        <NavLink to="/groups" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Groups</NavLink>
        <NavLink to="/settlements" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Settlements</NavLink>
        <NavLink to="/import" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>CSV Import</NavLink>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ fontSize: "14px", color: "var(--text-light)" }}>Hi, <strong>{user.name}</strong></span>
        <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "13px" }}>Logout</button>
      </div>
    </nav>
  );
}
