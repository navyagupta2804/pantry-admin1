// src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import useAuthListener from "./hooks/useAuthListener";

import ProtectedRoute from "./components/ProtectedRoute";
import LoadingSpinner from "./components/LoadingSpinner";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

function App() {
  const user = useAuthListener();
  const [isAdmin, setIsAdmin] = useState(null); // null = loading, true/false afterwards
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        setIsAdmin(false);
        return;
      }
      const data = snap.data();
      const adminFlag = !!data.isAdmin;
      setIsAdmin(adminFlag);
      if (!adminFlag) {
        navigate("/login");
      }
    }

    checkAdmin();
  }, [user, navigate]);

  if (user === undefined || isAdmin === null) {
    // auth is still resolving OR admin flag loading
    return (
      <div className="app-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute user={user} isAdmin={isAdmin}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute user={user} isAdmin={isAdmin}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/login"
        element={
          user && isAdmin ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
