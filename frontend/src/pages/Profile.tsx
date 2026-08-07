import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import AIStudyRecommendations from '../components/AIStudyRecommendations';
import type { StudyRecommendation } from '../components/AIStudyRecommendations';
import Footer from '../components/Footer';

import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Trophy, Zap, Calendar, Medal, Award, Flame, Mail, 
  CheckCircle2 
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

interface Badge {
  badgeId: string;
  name: string;
  description: string;
  iconCode: string;
  unlockCondition: string;
  isUnlocked: boolean;
}

interface ProgressData {
  name: string;
  correct: number;
  incorrect: number;
  totalQuestions: number;
}

// Icon mapper for dynamic achievements badges rendering
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Trophy,
  Zap,
  Calendar,
  Medal,
  Award,
};

const Profile: React.FC = () => {
  const { user } = useAuth();

  const [badges, setBadges] = useState<Badge[]>([]);
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Stats summary
  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);

  // UI status
  const [loading, setLoading] = useState<boolean>(true);
  const [progressLoading, setProgressLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // 1. Fetch user summary details
        const summaryResponse = await api.get('/users/profile');
        if (summaryResponse.data?.success) {
          setAttemptsCount(summaryResponse.data.stats.totalAttempts);
          setTotalScore(summaryResponse.data.stats.totalScore);
        }

        // 2. Fetch badges lists
        const badgesResponse = await api.get('/users/badges');
        if (badgesResponse.data?.success) {
          setBadges(badgesResponse.data.badges);
        }
      } catch (err) {
        console.error('Failed to load profile details:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchProgressData = async () => {
      try {
        // 3. Fetch progress charts datasets and structured AI recommendations
        const progressResponse = await api.get('/users/progress');
        if (progressResponse.data?.success) {
          setProgress(progressResponse.data.progress);
          // Parse the JSON string returned by the backend
          try {
            const parsed = JSON.parse(progressResponse.data.aiRecommendations ?? '{}');
            setRecommendations(parsed.recommendations ?? []);
          } catch {
            setRecommendations([]);
          }
        }
      } catch (err) {
        console.error('Failed to load progress details:', err);
      } finally {
        setProgressLoading(false);
      }
    };

    fetchProfileData();
    fetchProgressData();
  }, []);

  /** Force-refresh recommendations via the dedicated backend endpoint. */
  const handleRefreshRecommendations = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await api.post('/users/recommendations/refresh');
      if (res.data?.success) {
        setRecommendations(res.data.recommendations ?? []);
      }
    } catch (err) {
      console.error('Failed to refresh recommendations:', err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between gradient-bg text-white pt-24 pb-12 px-6">
      <div className="flex-1 w-full mb-12">
        <Navbar />
        <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        
        {/* User Card info */}
        <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-l-4 border-l-purple-500">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl font-black text-purple-400">
              {user?.username.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-1.5">
                {user?.username}
                <span className="text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded uppercase font-black tracking-wider">
                  {user?.role}
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {user?.email}</p>
            </div>
          </div>

          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-black text-purple-400">{attemptsCount}</div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Quizzes</div>
            </div>
            <div>
              <div className="text-2xl font-black text-yellow-400">{totalScore}</div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Points</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-black text-orange-400 flex items-center gap-1">
                <Flame className="w-5 h-5 fill-orange-400/20" /> {user?.streak}
              </div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Day Streak</div>
            </div>
          </div>
        </div>

        {/* Progress Charts & AI Guidance layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recharts chart block */}
          <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <BarChartIcon className="w-4 h-4 text-purple-400" /> Category Breakdown (%)
              </h3>
            </div>

            {progressLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : progress.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500 text-xs italic">
                Attempt quizzes to display performance analytics charts!
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={progress}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ background: '#111827', borderColor: '#1f2937', fontSize: 12, borderRadius: 8 }}
                      labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="correct" name="Correct %" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="incorrect" name="Incorrect %" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* AI Study Recommendations — structured card panel */}
          <div className="glass-card p-0 overflow-hidden border-t-4 border-t-indigo-500" style={{ minHeight: '200px', maxHeight: '420px' }}>
            <AIStudyRecommendations
              recommendations={recommendations}
              loading={progressLoading}
              refreshing={refreshing}
              onRefresh={handleRefreshRecommendations}
              hasAttempts={progress.length > 0}
            />
          </div>
        </div>

        {/* Badge unlock completions grid list */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-6">
            <Trophy className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Earned Badges &amp; Achievements</h3>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-24 glass-card animate-pulse bg-gray-900/10 border-gray-800" />
              ))}
            </div>
          ) : badges.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Achievements list is empty. Ask admin to configure badges seed data.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {badges.map((badge) => {
                const IconComponent = ICON_MAP[badge.iconCode] || Medal;
                return (
                  <div
                    key={badge.badgeId}
                    className={`p-4 border rounded-xl flex gap-3 transition-all duration-300 ${
                      badge.isUnlocked
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                        : 'bg-white/1 border-white/5 text-gray-500 opacity-60'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                      badge.isUnlocked 
                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' 
                        : 'bg-white/2 border-white/5 text-gray-600'
                    }`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                        {badge.name}
                        {badge.isUnlocked && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-1 leading-normal">{badge.description}</p>
                      <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider mt-2">
                        {badge.unlockCondition}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
};

// Quick standard icon placeholder wrapper
const BarChartIcon: React.FC<any> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export default Profile;
