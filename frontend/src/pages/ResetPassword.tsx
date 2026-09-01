import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, AlertTriangle, CheckCircle, KeyRound } from 'lucide-react';
import Footer from '../components/Footer';

/**
 * ResetPassword page — validates the token from the query string,
 * lets the user enter a new password, and submits to POST /auth/reset-password.
 */
const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // If no token present in URL, show error immediately
  useEffect(() => {
    if (!token || !email) {
      setError('Invalid or missing reset link. Please request a new one.');
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { email, token, newPassword });
      if (res.data?.success) {
        setSuccess('Password reset successful! Redirecting to login...');
        setTimeout(() => navigate('/auth', { state: { tab: 'login', message: 'Password updated. Please sign in.' } }), 2500);
      } else {
        setError(res.data?.message || 'Reset failed. Please request a new link.');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Invalid or expired link. Please request a new password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between gradient-bg relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-[30vw] h-[30vw] min-w-[300px] min-h-[300px] bg-purple-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[10%] right-[15%] w-[30vw] h-[30vw] min-w-[300px] min-h-[300px] bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 relative z-10">
        <div className="w-full max-w-md glass-card p-6 sm:p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-purple-500/10 rounded-full border border-purple-500/20 mb-4">
              <KeyRound className="w-7 h-7 text-purple-400" />
            </div>
            <h1 className="text-2xl font-black tracking-wider text-white mb-1">Reset Password</h1>
            <p className="text-xs text-gray-400 tracking-widest uppercase font-semibold">Set your new account password</p>
          </div>

          {/* Feedback banners */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-3"
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl flex items-center gap-3"
              >
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form — only shown when token is valid */}
          {token && email && !success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div className="space-y-2">
                <label htmlFor="reset-new-password" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="reset-new-password"
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    disabled={loading}
                    className="peer w-full glass-input py-3 pl-12 pr-12 text-sm bg-gray-950/40 border border-gray-800 hover:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl outline-none transition-all duration-200 disabled:opacity-50"
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 peer-focus:text-purple-400 transition-colors pointer-events-none" />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer" aria-label="Toggle visibility">
                    {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label htmlFor="reset-confirm-password" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="reset-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={loading}
                    className="peer w-full glass-input py-3 pl-12 pr-12 text-sm bg-gray-950/40 border border-gray-800 hover:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl outline-none transition-all duration-200 disabled:opacity-50"
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 peer-focus:text-purple-400 transition-colors pointer-events-none" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer" aria-label="Toggle visibility">
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                id="reset-password-submit"
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-500 mt-6">
            Remembered your password?{' '}
            <Link to="/auth" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ResetPassword;
