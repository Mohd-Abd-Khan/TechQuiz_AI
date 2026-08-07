import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import { Flame, Users, ArrowRight, Play, HelpCircle, Gamepad2, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';

interface Quiz {
  _id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  timeLimitPerQuestion: number;
  questionCount: number;
  isDailyChallenge: boolean;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { createMultiplayerRoom, joinMultiplayerRoom, room, joinError } = useSocket();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [dailyQuiz, setDailyQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [joinCode, setJoinCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch quizzes list
  const fetchQuizzes = async () => {
    try {
      const response = await api.get('/quizzes');
      if (response.data?.success) {
        const list: Quiz[] = response.data.quizzes;
        // Separate daily challenge
        const daily = list.find((q) => q.isDailyChallenge && q.questionCount > 0);
        const standard = list.filter((q) => !q.isDailyChallenge && q.questionCount > 0);
        
        setQuizzes(standard);
        if (daily) setDailyQuiz(daily);
      }
    } catch (err) {
      console.error('Failed to load quizzes list:', err);
      setError('Failed to retrieve quiz list. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Listen for socket join error or successful room updates
  useEffect(() => {
    if (joinError) {
      setError(joinError);
    } else if (room) {
      navigate(`/multiplayer/lobby/${room.code}`);
    }
  }, [joinError, room, navigate]);

  const handleStartSolo = (quizId: string) => {
    navigate(`/quiz/${quizId}`);
  };

  const handleHostMultiplayer = async (quiz: Quiz) => {
    setError(null);
    try {
      // Fetch full questions to pass to socket manager
      const response = await api.get(`/quizzes/${quiz._id}`);
      if (response.data?.success) {
        createMultiplayerRoom(quiz._id, quiz.title, response.data.questions);
      } else {
        setError('Failed to load questions for multiplayer room.');
      }
    } catch (err) {
      console.error('Multiplayer room creation error:', err);
      setError('Unable to initialize multiplayer room.');
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (joinCode.length !== 6 || isNaN(Number(joinCode))) {
      return setError('Lobby codes must be exactly 6 numeric digits.');
    }
    joinMultiplayerRoom(joinCode);
  };

  // Difficulty pill color styles helper
  const diffBadgeClass = (diff: string) => {
    switch (diff) {
      case 'advanced':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'intermediate':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      default:
        return 'bg-green-500/10 border-green-500/20 text-green-400';
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between gradient-bg text-white pt-24 pb-12 px-6">
      <div className="flex-1 w-full mb-12">
        <Navbar />
        <div className="max-w-6xl mx-auto space-y-10">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/30 border border-white/5 p-8 rounded-2xl backdrop-blur-md">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2 mb-2">
              Welcome back, <span className="text-purple-400">{user?.username}</span>!
            </h1>
            <p className="text-gray-400 text-sm max-w-xl">
              Sharpen your developer skills with our AI-powered learning system. Play solo for in-depth insights, or host multiplayer rooms to duel with friends in real-time.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-orange-500/5 border border-orange-500/15 p-4 rounded-xl">
            <Flame className="w-10 h-10 text-orange-400 animate-pulse fill-orange-400/20" />
            <div>
              <div className="text-xl font-black text-orange-400">{user?.streak || 0} Days</div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Current Play Streak</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dashboard Grid split (Daily challenge + Multiplayer Joining) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Daily challenge Panel */}
          <div className="lg:col-span-2 glass-card p-6 border-l-4 border-l-orange-500 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold">
                  DAILY QUIZ CHALLENGE
                </span>
              </div>
              {dailyQuiz ? (
                <>
                  <h2 className="text-xl font-bold text-white mb-2">{dailyQuiz.title}</h2>
                  <p className="text-gray-400 text-sm mb-6">{dailyQuiz.description}</p>
                  <div className="flex gap-4 text-xs text-gray-500 font-semibold mb-6">
                    <div>Category: <span className="text-purple-400">{dailyQuiz.category}</span></div>
                    <div>Difficulty: <span className="text-yellow-400 uppercase">{dailyQuiz.difficulty}</span></div>
                    <div>Questions: <span className="text-gray-300">{dailyQuiz.questionCount}</span></div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-gray-500 text-sm">
                  Daily Challenge generating... Check back in a few minutes or try standard challenges!
                </div>
              )}
            </div>
            {dailyQuiz && (
              <button
                onClick={() => handleStartSolo(dailyQuiz._id)}
                className="btn-primary flex items-center justify-center gap-2 py-3 px-6 text-sm w-full sm:w-auto self-start bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/20"
              >
                Attempt Challenge <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Join Multiplayer Panel */}
          <div className="glass-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Gamepad2 className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-md">Enter Match lobby</h3>
              </div>
              <p className="text-gray-400 text-xs mb-6">
                Have a 6-digit invite code? Paste it below to join your friends in a live quiz duel.
              </p>
            </div>
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <input
                type="text"
                required
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Lobby Code (e.g. 123456)"
                className="w-full glass-input text-center text-lg font-mono tracking-widest uppercase focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={joinCode.length !== 6}
                className="w-full btn-secondary text-sm font-semibold flex items-center justify-center gap-2"
              >
                Join Lobby <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Quizzes List */}
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-400" /> Standard Technical Quizzes
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="glass-card p-6 h-48 animate-pulse bg-gray-900/10 border-gray-800" />
              ))}
            </div>
          ) : quizzes.length === 0 ? (
            <div className="glass-card p-12 text-center text-gray-500 text-sm">
              No active quizzes available in the dashboard. Ask an admin to generate some AI content!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => (
                <motion.div
                  key={quiz._id}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="glass-card glass-card-hover p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-bold tracking-wider text-purple-400 uppercase">
                        {quiz.category}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 border rounded-full ${diffBadgeClass(quiz.difficulty)}`}>
                        {quiz.difficulty}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-md mb-2">{quiz.title}</h3>
                    <p className="text-gray-400 text-xs line-clamp-2 mb-4">{quiz.description}</p>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-6">
                      Questions: <span className="text-gray-300">{quiz.questionCount}</span> | Timer: <span className="text-gray-300">{quiz.timeLimitPerQuestion}s / q</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleStartSolo(quiz._id)}
                      className="btn-primary py-2 px-3 text-xs flex items-center justify-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Solo
                    </button>
                    <button
                      onClick={() => handleHostMultiplayer(quiz)}
                      className="btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-1 hover:text-purple-400 hover:border-purple-500/30"
                    >
                      <Users className="w-3.5 h-3.5" /> Host Match
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
