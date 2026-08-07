import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, AlertTriangle, CheckCircle } from 'lucide-react';
import Footer from '../components/Footer';

const VerifyOtp: React.FC = () => {
  const { verifyUserOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Retrieve email address passed from registration route state
  useEffect(() => {
    const passedEmail = location.state?.email;
    if (passedEmail) {
      setEmail(passedEmail);
    } else {
      setError('No verification target email found. Please register again.');
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      return setError('No email to verify.');
    }
    if (otp.length !== 6 || isNaN(Number(otp))) {
      return setError('Please enter a valid 6-digit numeric verification code.');
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await verifyUserOtp(email, otp);
      if (res.success) {
        setSuccess(res.message);
        setTimeout(() => {
          navigate('/auth', { state: { tab: 'login', message: 'Account verified successfully! You can log in.' } });
        }, 2500);
      } else {
        setError(res.message || 'OTP verification failed.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between gradient-bg relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md glass-card p-8 relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-purple-500/10 rounded-full border border-purple-500/20 mb-4">
            <KeyRound className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">Verify Your Email</h2>
          <p className="text-sm text-gray-400">
            We've sent a 6-digit verification code to
          </p>
          <p className="text-sm font-semibold text-purple-300 mt-1 flex items-center justify-center gap-1">
            <Mail className="w-4 h-4" /> {email || 'your email'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-400 mb-2">
              Verification Code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full glass-input text-center text-2xl tracking-[12px] font-mono focus:border-purple-500"
              disabled={loading || !!success}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !!success || otp.length !== 6}
            className="w-full btn-primary flex justify-center py-3 px-4 disabled:opacity-50"
          >
            {loading ? 'Verifying Code...' : 'Verify & Activate'}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/auth')}
            className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            Back to Sign In
          </button>
      </div>
      </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default VerifyOtp;
