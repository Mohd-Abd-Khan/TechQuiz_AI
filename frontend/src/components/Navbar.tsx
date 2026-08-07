import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, LogOut, LayoutDashboard, User, Trophy, Shield } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const handleLogout = async () => {
    await logoutUser();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
      isActive(path)
        ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
        : 'text-gray-400 hover:text-white border border-transparent'
    }`;

  return (
    <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-md bg-slate-950/40 border-b border-white/5 px-6 py-4 flex items-center justify-between">
      {/* Brand Logo */}
      <Link to="/dashboard" className="flex items-center gap-2">
        <span className="text-lg font-extrabold tracking-widest bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
          TECHQUIZ AI
        </span>
      </Link>

      {/* Navigation Links */}
      <div className="hidden md:flex items-center gap-2">
        <Link to="/dashboard" className={linkClass('/dashboard')}>
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </Link>
        <Link to="/profile" className={linkClass('/profile')}>
          <User className="w-4 h-4" /> Profile
        </Link>
        <Link to="/leaderboard" className={linkClass('/leaderboard')}>
          <Trophy className="w-4 h-4" /> Leaderboard
        </Link>
        {user.role === 'admin' && (
          <Link to="/admin" className={linkClass('/admin')}>
            <Shield className="w-4 h-4" /> Admin Panel
          </Link>
        )}
      </div>

      {/* User Stats & Logout */}
      <div className="flex items-center gap-4">
        {/* Streak indicator */}
        <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse">
          <Flame className="w-4 h-4 fill-orange-400" />
          <span>{user.streak} DAY STREAK</span>
        </div>

        {/* Username */}
        <div className="hidden sm:block text-right">
          <div className="text-sm font-semibold text-white">{user.username}</div>
          <div className="text-[10px] text-purple-400 uppercase tracking-widest font-bold">
            {user.role}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 text-gray-400 hover:text-red-400 transition-colors bg-gray-900/50 hover:bg-red-500/10 rounded-lg border border-gray-800 hover:border-red-500/20 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
