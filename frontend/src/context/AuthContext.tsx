import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api, { setAccessToken } from '../utils/api';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  streak: number;
  badges: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  registerUser: (username: string, email: string, password: string) => Promise<{ success: boolean; message: string; email: string }>;
  verifyUserOtp: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  loginUser: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logoutUser: () => Promise<void>;
  updateUserStreak: (streak: number) => void;
  updateUserBadges: (badgeId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to fetch user details using the newly acquired access token
  const fetchUserProfile = async (): Promise<void> => {
    try {
      const response = await api.get('/users/profile');
      if (response.data?.success) {
        setUser(response.data.user);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setUser(null);
      setAccessToken('');
    }
  };

  // Run on mount to check if an HttpOnly cookie session exists (Silent Login)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await api.post('/auth/refresh');
        if (response.data?.accessToken) {
          setAccessToken(response.data.accessToken);
          await fetchUserProfile();
        }
      } catch (err) {
        // Safe to ignore on mount (no active session)
        setAccessToken('');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for session expiry event from Axios interceptor
    const handleSessionExpiry = () => {
      setUser(null);
      setAccessToken('');
    };

    window.addEventListener('auth-session-expired', handleSessionExpiry);
    return () => {
      window.removeEventListener('auth-session-expired', handleSessionExpiry);
    };
  }, []);

  const registerUser = async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  };

  const verifyUserOtp = async (email: string, otp: string) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  };

  const loginUser = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data?.success && response.data?.accessToken) {
      setAccessToken(response.data.accessToken);
      setUser(response.data.user);
    }
    return response.data;
  };

  const logoutUser = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request error:', err);
    } finally {
      setUser(null);
      setAccessToken('');
    }
  };

  const updateUserStreak = (streak: number) => {
    if (user) {
      setUser({ ...user, streak });
    }
  };

  const updateUserBadges = (badgeId: string) => {
    if (user && !user.badges.includes(badgeId)) {
      setUser({ ...user, badges: [...user.badges, badgeId] });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        registerUser,
        verifyUserOtp,
        loginUser,
        logoutUser,
        updateUserStreak,
        updateUserBadges,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
