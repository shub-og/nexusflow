import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ProjectPage from './pages/ProjectPage';
import NewProject from './pages/NewProject';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import InvitePage from './pages/InvitePage';
import WorkspaceSetup from './pages/WorkspaceSetup';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route path="/setup" element={<ProtectedRoute><WorkspaceSetup /></ProtectedRoute>} />

          {/* Protected app shell */}
          <Route path="/" element={
            <ProtectedRoute>
              <SocketProvider>
                <AppLayout />
              </SocketProvider>
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="projects/new" element={<NewProject />} />
            <Route path="projects/:projectId" element={<ProjectPage />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
