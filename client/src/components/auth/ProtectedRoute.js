import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, dbUser, workspace, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"/>
        <p className="text-gray-400 text-sm mt-3">Loading…</p>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Redirect to workspace setup if user is logged in but has no workspace yet
  if (dbUser && !workspace && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  return children;
}
