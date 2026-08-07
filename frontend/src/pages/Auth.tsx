import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Mail, Lock, User, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Footer from '../components/Footer';

const Auth: React.FC = () => {
  const { loginUser, registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility controls
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Set initial tab from state (e.g. redirected from VerifyOtp)
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab as 'login' | 'register');
    }
    if (location.state?.message) {
      setSuccess(location.state.message);
    }
  }, [location]);

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await loginUser(email, password);
      if (res.success) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      } else {
        setError(res.message || 'Login failed.');
      }
    } catch (err: any) {
      if (err.response?.data?.isVerified === false) {
        setError(err.response.data.message);
        setTimeout(() => {
          navigate('/verify-otp', { state: { email } });
        }, 2000);
      } else {
        setError(err.response?.data?.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);

    try {
      const res = await registerUser(username, email, password);
      if (res.success) {
        setSuccess(res.message);
        setTimeout(() => {
          navigate('/verify-otp', { state: { email } });
        }, 2000);
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Registration failed. Ensure password is strong (8+ chars, uppercase, digit, symbol).'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between gradient-bg relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-[30vw] h-[30vw] min-w-[300px] min-h-[300px] bg-purple-600/10 rounded-full blur-[120px] sm:blur-[140px]" />
        <div className="absolute bottom-[10%] right-[15%] w-[30vw] h-[30vw] min-w-[300px] min-h-[300px] bg-indigo-600/10 rounded-full blur-[120px] sm:blur-[140px]" />
      </div>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 relative z-10">
        <div className="w-full max-w-md glass-card p-6 sm:p-8 md:p-10 relative">
        {/* Logo Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-wider text-glow bg-gradient-to-r from-purple-400 via-violet-300 to-indigo-400 bg-clip-text text-transparent mb-2">
            TECHQUIZ AI
          </h1>
          <p className="text-[10px] sm:text-xs text-gray-400 font-semibold tracking-widest uppercase">
            PREMIUM COGNITIVE LEARNING PLATFORM
          </p>
        </div>

        {/* Tab Controls (ARIA Compliant) */}
        <div 
          role="tablist"
          aria-label="Sign in or create account tabs"
          className="flex bg-gray-950/60 p-1 rounded-xl border border-gray-800/80 mb-6 relative"
        >
          <button
            id="tab-login"
            role="tab"
            aria-selected={activeTab === 'login'}
            aria-controls="panel-login"
            tabIndex={0}
            onClick={() => handleTabChange('login')}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 cursor-pointer ${
              activeTab === 'login' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <LogIn className="w-4 h-4" /> 
            <span>Sign In</span>
            {activeTab === 'login' && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg -z-10 shadow-md shadow-purple-600/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          <button
            id="tab-register"
            role="tab"
            aria-selected={activeTab === 'register'}
            aria-controls="panel-register"
            tabIndex={0}
            onClick={() => handleTabChange('register')}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 cursor-pointer ${
              activeTab === 'register' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <UserPlus className="w-4 h-4" /> 
            <span>Sign Up</span>
            {activeTab === 'register' && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg -z-10 shadow-md shadow-purple-600/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        </div>

        {/* Notifications */}
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

        {/* Form Tab Panels */}
        <AnimatePresence mode="wait">
          {activeTab === 'login' ? (
            <motion.div
              key="login"
              id="panel-login"
              role="tabpanel"
              aria-labelledby="tab-login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="login-email" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="peer w-full glass-input py-3 pl-12 pr-4 text-sm bg-gray-950/40 border border-gray-800 hover:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 peer-focus:text-purple-400 transition-colors duration-200 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="peer w-full glass-input py-3 pl-12 pr-12 text-sm bg-gray-950/40 border border-gray-800 hover:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 peer-focus:text-purple-400 transition-colors duration-200 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none focus:text-purple-400 transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-950 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="register"
              id="panel-register"
              role="tabpanel"
              aria-labelledby="tab-register"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <form onSubmit={handleRegisterSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="register-username" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      id="register-username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="developer_name"
                      className="peer w-full glass-input py-3 pl-12 pr-4 text-sm bg-gray-950/40 border border-gray-800 hover:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    />
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 peer-focus:text-purple-400 transition-colors duration-200 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="register-email" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="register-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="peer w-full glass-input py-3 pl-12 pr-4 text-sm bg-gray-950/40 border border-gray-800 hover:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 peer-focus:text-purple-400 transition-colors duration-200 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="register-password" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Create Account Password
                  </label>
                  <div className="relative">
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Choose a new secure password"
                      aria-describedby="password-requirements"
                      className="peer w-full glass-input py-3 pl-12 pr-12 text-sm bg-gray-950/40 border border-gray-800 hover:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 peer-focus:text-purple-400 transition-colors duration-200 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none focus:text-purple-400 transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p id="password-requirements" className="text-[10px] text-gray-500 mt-1 animate-pulse">
                    Create a new secure password specifically for your TechQuiz AI account (8+ chars, uppercase, digit, symbol).
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="register-confirm-password" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Confirm Account Password
                  </label>
                  <div className="relative">
                    <input
                      id="register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      className="peer w-full glass-input py-3 pl-12 pr-12 text-sm bg-gray-950/40 border border-gray-800 hover:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 peer-focus:text-purple-400 transition-colors duration-200 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none focus:text-purple-400 transition-colors cursor-pointer"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-950 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Auth;
