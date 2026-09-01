import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages imports
import Auth from './pages/Auth';
import VerifyOtp from './pages/VerifyOtp';
import Dashboard from './pages/Dashboard';
import QuizAttempt from './pages/QuizAttempt';
import QuizResult from './pages/QuizResult';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import AdminPanel from './pages/AdminPanel';
import ResetPassword from './pages/ResetPassword';

/**
 * Route Guard for logged in users (checks user session)
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

/**
 * Route Guard for administrative privileges
 */
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * Route Guard to prevent already logged in users from visiting auth views
 */
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public/Auth Routes */}
          <Route
            path="/auth"
            element={
              <PublicOnlyRoute>
                <Auth />
              </PublicOnlyRoute>
            }
          />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Dashboard/Gameplay Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:id"
            element={
              <ProtectedRoute>
                <QuizAttempt />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/result/:attemptId"
            element={
              <ProtectedRoute>
                <QuizResult />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Privilege Control console */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />

          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
