import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import { Trophy, Medal, ShieldAlert } from 'lucide-react';
import Footer from '../components/Footer';

interface LeaderboardEntry {
  _id: string;
  totalScore: number;
  timeTaken: number;
  username: string;
  createdAt: string;
}

interface Quiz {
  _id: string;
  title: string;
  category: string;
  difficulty: string;
}

const Leaderboard: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // UI States
  const [loadingQuizzes, setLoadingQuizzes] = useState<boolean>(true);
  const [loadingBoard, setLoadingBoard] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch quizzes on mount
  useEffect(() => {
    const fetchQuizzesList = async () => {
      try {
        const response = await api.get('/quizzes');
        if (response.data?.success) {
          const list = response.data.quizzes;
          setQuizzes(list);
          if (list.length > 0) {
            setSelectedQuizId(list[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch quizzes for leaderboard:', err);
        setError('Unable to load quizzes list.');
      } finally {
        setLoadingQuizzes(false);
      }
    };

    fetchQuizzesList();
  }, []);

  // Fetch leaderboard data when selectedQuizId changes
  useEffect(() => {
    if (!selectedQuizId) return;

    const fetchLeaderboardData = async () => {
      setLoadingBoard(true);
      setError(null);
      try {
        const response = await api.get(`/quizzes/${selectedQuizId}/leaderboard`);
        if (response.data?.success) {
          setLeaderboard(response.data.leaderboard);
        }
      } catch (err) {
        console.error('Failed to load leaderboard details:', err);
        setError('Could not retrieve leaderboard standings.');
      } finally {
        setLoadingBoard(false);
      }
    };

    fetchLeaderboardData();
  }, [selectedQuizId]);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between gradient-bg text-white pt-24 pb-12 px-6">
      <div className="flex-1 w-full mb-12">
        <Navbar />
        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        
        {/* Header Title block */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-purple-500/10 rounded-full border border-purple-500/20 mb-3 text-purple-400">
            <Trophy className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-glow">Global Leaderboards</h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-semibold">Track the top-10 speed achievements</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dropdown Selection Card */}
        <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label htmlFor="quizSelect" className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Select Topic Board:
          </label>
          {loadingQuizzes ? (
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <select
              id="quizSelect"
              value={selectedQuizId}
              onChange={(e) => setSelectedQuizId(e.target.value)}
              className="glass-input w-full sm:w-80 text-sm focus:border-purple-500"
            >
              {quizzes.map((q) => (
                <option key={q._id} value={q._id} className="bg-gray-950 text-white">
                  [{q.category.toUpperCase()}] {q.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Standings Grid list */}
        <div className="glass-card overflow-hidden">
          {loadingBoard ? (
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-gray-500">Querying leaderboard standings...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="py-24 text-center text-gray-500 text-sm italic">
              No attempts have been recorded for this quiz yet. Be the first to secure a place!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/2 border-b border-white/5 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    <th className="py-4 px-6 text-center">Rank</th>
                    <th className="py-4 px-6">Player</th>
                    <th className="py-4 px-6 text-center">Time</th>
                    <th className="py-4 px-6 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {leaderboard.map((row, index) => {
                    const isPodium = index < 3;
                    const rankClass = isPodium 
                      ? index === 0 
                        ? 'text-yellow-400 font-black' 
                        : index === 1 
                          ? 'text-gray-300 font-black' 
                          : 'text-amber-600 font-black'
                      : 'text-gray-500';

                    return (
                      <tr key={row._id} className="hover:bg-white/2">
                        <td className="py-4 px-6 text-center font-mono font-bold">
                          <span className={rankClass}>
                            {index === 0 && <Medal className="w-4 h-4 inline fill-yellow-400/10 mr-1" />}
                            #{index + 1}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-white">{row.username}</td>
                        <td className="py-4 px-6 text-center text-gray-400 font-mono">{row.timeTaken}s</td>
                        <td className="py-4 px-6 text-right font-black text-purple-400 text-glow pr-8">
                          {row.totalScore} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
};

export default Leaderboard;
