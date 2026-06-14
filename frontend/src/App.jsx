import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import GroupDetails from "./pages/GroupDetails";
import Expenses from "./pages/Expenses";
import Balances from "./pages/Balances";
import Settlements from "./pages/Settlements";
import CSVImport from "./pages/CSVImport";

// Authenticated layout wrapper
function ProtectedLayout({ children }) {
  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}

// Route protector checks local storage for JWT tokens
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? (
    <ProtectedLayout>{children}</ProtectedLayout>
  ) : (
    <Navigate to="/login" replace />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Unauthenticated routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Authenticated routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <Groups />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:id"
          element={
            <ProtectedRoute>
              <GroupDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:groupId/expenses"
          element={
            <ProtectedRoute>
              <Expenses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:groupId/balances"
          element={
            <ProtectedRoute>
              <Balances />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:groupId/settlements"
          element={
            <ProtectedRoute>
              <Settlements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settlements"
          element={
            <ProtectedRoute>
              <Settlements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/import"
          element={
            <ProtectedRoute>
              <CSVImport />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
