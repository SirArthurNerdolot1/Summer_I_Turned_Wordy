import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ isAdmin, children }) {
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
