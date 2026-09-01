import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { 
  Shield, Plus, Trash2, BrainCircuit, Sparkles, Check, ChevronDown, 
  ChevronUp, ToggleLeft, ToggleRight, X, Save, Loader2 
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Quiz {
  _id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  timeLimitPerQuestion: number;
  questionCount: number;
  isActive: boolean;
}

interface Question {
  _id?: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  points: number;
}

interface ActivityDataPoint {
  date: string;
  attempts: number;
  avgScore: number;
}

interface CategoryDataPoint {
  category: string;
  count: number;
  avgScore: number;
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  // Lists
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');

  // Analytics Stats
  const [summary, setSummary] = useState({ totalUsers: 0, totalQuizzes: 0, totalAttempts: 0, avgScore: 0 });
  const [lineChartData, setLineChartData] = useState<ActivityDataPoint[]>([]);
  const [radarChartData, setRadarChartData] = useState<CategoryDataPoint[]>([]);

  // AI Generator States
  const [aiTopic, setAiTopic] = useState<string>('');
  const [aiDifficulty, setAiDifficulty] = useState<string>('intermediate');
  const [aiCount, setAiCount] = useState<number>(5);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<Question[]>([]);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiImporting, setAiImporting] = useState<boolean>(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  // Manual Forms & Modals
  const [createQuizOpen, setCreateQuizOpen] = useState<boolean>(false);
  const [newQuizTitle, setNewQuizTitle] = useState<string>('');
  const [newQuizDesc, setNewQuizDesc] = useState<string>('');
  const [newQuizCategory, setNewQuizCategory] = useState<string>('');
  const [newQuizDifficulty, setNewQuizDifficulty] = useState<'basic' | 'intermediate' | 'advanced'>('basic');
  const [newQuizTime, setNewQuizTime] = useState<number>(30);

  const [addQuestionOpen, setAddQuestionOpen] = useState<boolean>(false);
  const [qText, setQText] = useState<string>('');
  const [qOpt1, setQOpt1] = useState<string>('');
  const [qOpt2, setQOpt2] = useState<string>('');
  const [qOpt3, setQOpt3] = useState<string>('');
  const [qOpt4, setQOpt4] = useState<string>('');
  const [qCorrectIndex, setQCorrectIndex] = useState<number>(0);
  const [qExplanation, setQExplanation] = useState<string>('');
  const [qPoints, setQPoints] = useState<number>(10);

  // UI expand states
  const [expandedQuizId, setExpandedQuizId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch full details on mount
  const fetchData = async () => {
    try {
      // Fetch admin quizzes
      const quizRes = await api.get('/quizzes/admin/list');
      if (quizRes.data?.success) {
        setQuizzes(quizRes.data.quizzes);
      }

      // Fetch analytics summary & charts
      const analyticsRes = await api.get('/users/admin/analytics');
      if (analyticsRes.data?.success) {
        setSummary(analyticsRes.data.summary);
        setLineChartData(analyticsRes.data.charts.activityOverTime);
        setRadarChartData(analyticsRes.data.charts.quizzesByCategory);
      }
    } catch (err) {
      console.error('Failed to load admin panel data:', err);
      setError('Failed to fetch administrator console states. Ensure you are an active Admin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch questions when quiz is expanded
  const handleQuizExpand = async (quizId: string) => {
    if (expandedQuizId === quizId) {
      setExpandedQuizId('');
      setQuestions([]);
      return;
    }

    setExpandedQuizId(quizId);
    setSelectedQuizId(quizId);
    setQuestions([]);

    try {
      const response = await api.get(`/quizzes/admin/quiz/${quizId}/questions`);
      if (response.data?.success) {
        setQuestions(response.data.questions);
      }
    } catch (err) {
      console.error('Failed to load quiz questions:', err);
    }
  };

  // Toggle active/inactive state
  const handleToggleQuiz = async (quiz: Quiz) => {
    try {
      const updatedStatus = !quiz.isActive;
      const response = await api.put(`/quizzes/admin/update/${quiz._id}`, {
        isActive: updatedStatus,
      });

      if (response.data?.success) {
        setQuizzes(
          quizzes.map((q) => (q._id === quiz._id ? { ...q, isActive: updatedStatus } : q))
        );
      }
    } catch (err) {
      console.error('Failed to update quiz toggle:', err);
    }
  };

  // Delete Quiz
  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz and all its questions? This action cannot be undone.')) return;
    try {
      const response = await api.delete(`/quizzes/admin/delete/${quizId}`);
      if (response.data?.success) {
        setQuizzes(quizzes.filter((q) => q._id !== quizId));
        if (expandedQuizId === quizId) {
          setExpandedQuizId('');
          setQuestions([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete quiz:', err);
    }
  };

  // Handle manual quiz creation
  const handleCreateQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/quizzes/admin/create', {
        title: newQuizTitle,
        description: newQuizDesc,
        category: newQuizCategory,
        difficulty: newQuizDifficulty,
        timeLimitPerQuestion: newQuizTime,
      });

      if (response.data?.success) {
        setQuizzes([response.data.quiz, ...quizzes]);
        setCreateQuizOpen(false);
        // Reset forms
        setNewQuizTitle('');
        setNewQuizDesc('');
        setNewQuizCategory('');
        setNewQuizDifficulty('basic');
        setNewQuizTime(30);
      }
    } catch (err) {
      console.error('Failed to create quiz:', err);
    }
  };

  // Handle manual question addition
  const handleAddQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post(`/quizzes/admin/quiz/${selectedQuizId}/question/add`, {
        text: qText,
        options: [qOpt1, qOpt2, qOpt3, qOpt4],
        correctIndex: qCorrectIndex,
        explanation: qExplanation,
        points: qPoints,
      });

      if (response.data?.success) {
        setQuestions([...questions, response.data.question]);
        // Update quiz questionCount locally
        setQuizzes(
          quizzes.map((q) => (q._id === selectedQuizId ? { ...q, questionCount: q.questionCount + 1 } : q))
        );
        setAddQuestionOpen(false);
        // Reset fields
        setQText('');
        setQOpt1('');
        setQOpt2('');
        setQOpt3('');
        setQOpt4('');
        setQCorrectIndex(0);
        setQExplanation('');
        setQPoints(10);
      }
    } catch (err) {
      console.error('Failed to add question:', err);
    }
  };

  // Delete single question
  const handleDeleteQuestion = async (qId: string) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      const response = await api.delete(`/quizzes/admin/question/delete/${qId}`);
      if (response.data?.success) {
        setQuestions(questions.filter((q) => q._id !== qId));
        setQuizzes(
          quizzes.map((q) => (q._id === selectedQuizId ? { ...q, questionCount: q.questionCount - 1 } : q))
        );
      }
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  // Generate Questions with Gemini AI
  const handleGenerateQuestions = async () => {
    if (!aiTopic || aiLoading) return;
    setAiLoading(true);
    setAiGeneratedQuestions([]);
    setAiSuccessMsg(null);

    try {
      const response = await api.post('/ai/generate-questions', {
        topic: aiTopic,
        difficulty: aiDifficulty,
        count: aiCount,
      });

      if (response.data?.success) {
        setAiGeneratedQuestions(response.data.questions);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate AI questions. Rate limit might be active.');
    } finally {
      setAiLoading(false);
    }
  };

  // Approve and import AI generated questions to database
  const handleApproveAndImport = async () => {
    if (aiGeneratedQuestions.length === 0 || aiImporting || !selectedQuizId) return;
    setAiImporting(true);
    setAiSuccessMsg(null);

    try {
      const response = await api.post(`/quizzes/admin/quiz/${selectedQuizId}/import`, {
        questions: aiGeneratedQuestions,
      });

      if (response.data?.success) {
        setAiSuccessMsg(response.data.message);
        // Reload questions list
        const loadRes = await api.get(`/quizzes/admin/quiz/${selectedQuizId}/questions`);
        if (loadRes.data?.success) {
          setQuestions(loadRes.data.questions);
        }
        // Update quiz counts
        setQuizzes(
          quizzes.map((q) => (q._id === selectedQuizId ? { ...q, questionCount: q.questionCount + aiGeneratedQuestions.length } : q))
        );
        // Wipes preview list
        setAiGeneratedQuestions([]);
        setAiTopic('');
      }
    } catch (err) {
      console.error('Failed to import questions:', err);
      alert('Could not import questions into the database.');
    } finally {
      setAiImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Opening Admin control console...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white px-6">
        <div className="max-w-md w-full glass-card p-6 text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Access Denied</h3>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary w-full">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between gradient-bg text-white pt-24 pb-12 px-6">
      <div className="flex-1 w-full mb-12">
        <Navbar />
        <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Title */}
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-purple-400" />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider">Admin Control Panel</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Platform Analytics &amp; AI Content Editor</p>
          </div>
        </div>

        {/* Analytics counts overview grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Active Users</div>
            <div className="text-2xl font-black text-white mt-1">{summary.totalUsers}</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Quizzes</div>
            <div className="text-2xl font-black text-purple-400 mt-1">{summary.totalQuizzes}</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Attempts Logged</div>
            <div className="text-2xl font-black text-indigo-400 mt-1">{summary.totalAttempts}</div>
          </div>
          <div className="glass-card p-4">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Avg Total Score</div>
            <div className="text-2xl font-black text-green-400 mt-1">{summary.avgScore} pts</div>
          </div>
        </div>

        {/* Recharts trend lines charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Attempts over time line chart */}
          <div className="md:col-span-2 glass-card p-5 h-64 flex flex-col justify-between">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Quiz Activity Over Time (Last 7 Days)</div>
            {lineChartData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-500 italic">No activity recorded.</div>
            ) : (
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} />
                    <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', fontSize: 11 }} />
                    <Line type="monotone" dataKey="attempts" stroke="#8b5cf6" strokeWidth={2.5} name="Attempts Count" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Quizzes by category radar chart */}
          <div className="glass-card p-5 h-64 flex flex-col justify-between">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Quiz Topics Weight Distribution</div>
            {radarChartData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-500 italic">No categories yet.</div>
            ) : (
              <div className="flex-1 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarChartData}>
                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                    <PolarAngleAxis dataKey="category" stroke="#9ca3af" fontSize={9} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="#4b5563" fontSize={8} />
                    <Radar name="Quizzes" dataKey="count" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Quizzes Editor panel */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
            <h3 className="font-bold text-white text-md uppercase tracking-wider flex items-center gap-2">
              Quizzes Editor Registry
            </h3>
            <button
              onClick={() => setCreateQuizOpen(true)}
              className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create Quiz Shell
            </button>
          </div>

          {/* Quizzes list */}
          <div className="space-y-4">
            {quizzes.map((quiz) => {
              const isExpanded = expandedQuizId === quiz._id;
              return (
                <div key={quiz._id} className="border border-white/5 bg-white/1 rounded-xl overflow-hidden">
                  
                  {/* Collapsed Header item */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 cursor-pointer" onClick={() => handleQuizExpand(quiz._id)}>
                      <div className="mt-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm flex items-center gap-2">
                          {quiz.title}
                          <span className="text-[9px] bg-purple-500/10 border border-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-black uppercase">
                            {quiz.category}
                          </span>
                        </h4>
                        <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                          Difficulty: <span className="text-gray-300 uppercase">{quiz.difficulty}</span> | Questions: <span className="text-gray-300">{quiz.questionCount}</span> | Timer: <span className="text-gray-300">{quiz.timeLimitPerQuestion}s</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Active status toggle */}
                      <button
                        onClick={() => handleToggleQuiz(quiz)}
                        title={quiz.isActive ? 'Active - Toggle to disable' : 'Disabled - Toggle to enable'}
                        className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {quiz.isActive ? (
                          <ToggleRight className="w-8 h-8 text-purple-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-gray-600" />
                        )}
                      </button>

                      {/* Delete Quiz */}
                      <button
                        onClick={() => handleDeleteQuiz(quiz._id)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Questions Editor details */}
                  {isExpanded && (
                    <div className="p-5 border-t border-white/5 bg-gray-950/20 space-y-6">
                      
                      {/* Control buttons */}
                      <div className="flex flex-wrap gap-4 border-b border-white/5 pb-4">
                        <button
                          onClick={() => setAddQuestionOpen(true)}
                          className="btn-primary py-2 px-3 text-xs flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Manual MCQ
                        </button>

                        <button
                          onClick={() => {
                            setAiGeneratedQuestions([]);
                            setAiTopic('');
                            // Focus state set to trigger AI card
                            const el = document.getElementById('ai-generator-widget');
                            el?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="btn-secondary py-2 px-3 text-xs flex items-center gap-1 hover:text-purple-400 hover:border-purple-500/30"
                        >
                          <BrainCircuit className="w-3.5 h-3.5" /> AI Generate MCQs
                        </button>
                      </div>

                      {/* Questions list */}
                      <div className="space-y-3">
                        <h5 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Questions list ({questions.length})</h5>
                        {questions.length === 0 ? (
                          <p className="text-xs text-gray-500 italic py-4">No questions created yet for this quiz shell.</p>
                        ) : (
                          questions.map((q, qIdx) => (
                            <div key={q._id} className="flex justify-between items-start gap-4 p-3 bg-white/2 border border-white/5 rounded-lg text-xs">
                              <div>
                                <p className="font-bold text-white leading-relaxed">
                                  {qIdx + 1}. {q.text}
                                </p>
                                <div className="grid grid-cols-2 gap-2 mt-2 max-w-lg">
                                  {q.options.map((opt, optIdx) => (
                                    <div key={optIdx} className={`p-1.5 rounded border ${
                                      optIdx === q.correctIndex 
                                        ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                                        : 'bg-white/1 border-white/5 text-gray-500'
                                    }`}>
                                      {optIdx + 1}. {opt}
                                    </div>
                                  ))}
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2 italic leading-relaxed">
                                  <strong>Explanation:</strong> {q.explanation}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteQuestion(q._id!)}
                                className="text-gray-500 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI MCQ Questions Generator Panel */}
        {expandedQuizId && (
          <div id="ai-generator-widget" className="glass-card p-6 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-md uppercase tracking-wider">Gemini AI MCQ Generator</h3>
              </div>
              <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-black">
                TARGET: {quizzes.find((q) => q._id === selectedQuizId)?.title}
              </span>
            </div>

            {aiSuccessMsg && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>{aiSuccessMsg}</span>
              </div>
            )}

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Technical Subtopic</label>
                <input
                  type="text"
                  required
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. React Hooks, Async Storage"
                  className="w-full glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Target Difficulty</label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value)}
                  className="w-full glass-input text-xs"
                >
                  <option value="basic">Basic</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Question Count ({aiCount})
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={aiCount}
                  onChange={(e) => setAiCount(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-3"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateQuestions}
              disabled={aiLoading || !aiTopic.trim()}
              className="btn-primary py-3 px-6 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gemini is compiling JSON questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate MCQs with AI</span>
                </>
              )}
            </button>

            {/* AI Preview Slider */}
            {aiGeneratedQuestions.length > 0 && (
              <div className="mt-8 space-y-6 border-t border-white/5 pt-6 animate-fadeIn">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Generated Questions Preview List ({aiGeneratedQuestions.length})
                </h4>

                <div className="space-y-4">
                  {aiGeneratedQuestions.map((q, idx) => (
                    <div key={idx} className="p-4 bg-white/2 border border-white/5 rounded-xl space-y-3 text-xs">
                      <p className="font-bold text-white leading-relaxed">
                        {idx + 1}. {q.text}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className={`p-2 border rounded-lg ${
                            oIdx === q.correctIndex 
                              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                              : 'bg-white/1 border-white/5 text-gray-500'
                          }`}>
                            {oIdx + 1}. {opt}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 italic">
                        <strong>Explanation:</strong> {q.explanation}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleApproveAndImport}
                  disabled={aiImporting}
                  className="btn-primary py-3 px-6 text-sm flex items-center gap-2"
                >
                  {aiImporting ? 'Importing questions...' : 'Approve & Import to Quiz'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================================
          CREATE QUIZ SHELL MODAL
          ====================================================================== */}
      {createQuizOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md glass-card p-6 border border-white/10 relative"
          >
            <button onClick={() => setCreateQuizOpen(false)} className="absolute right-4 top-4 text-gray-500 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-white text-md uppercase tracking-wider mb-6">Create New Quiz Shell</h3>

            <form onSubmit={handleCreateQuizSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quiz Title</label>
                <input
                  type="text"
                  required
                  value={newQuizTitle}
                  onChange={(e) => setNewQuizTitle(e.target.value)}
                  placeholder="e.g. Advanced JavaScript Patterns"
                  className="w-full glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  required
                  value={newQuizDesc}
                  onChange={(e) => setNewQuizDesc(e.target.value)}
                  placeholder="Short description of quiz topics..."
                  rows={2}
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</label>
                  <input
                    type="text"
                    required
                    value={newQuizCategory}
                    onChange={(e) => setNewQuizCategory(e.target.value)}
                    placeholder="e.g. React"
                    className="w-full glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Difficulty</label>
                  <select
                    value={newQuizDifficulty}
                    onChange={(e) => setNewQuizDifficulty(e.target.value as any)}
                    className="w-full glass-input text-xs"
                  >
                    <option value="basic">Basic</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Time Limit Per Question (s)</label>
                <input
                  type="number"
                  required
                  min="10"
                  max="120"
                  value={newQuizTime}
                  onChange={(e) => setNewQuizTime(parseInt(e.target.value, 10))}
                  className="w-full glass-input text-xs"
                />
              </div>

              <button type="submit" className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Create Quiz
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* ======================================================================
          ADD MANUAL MCQ QUESTION MODAL
          ====================================================================== */}
      {addQuestionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg glass-card p-6 border border-white/10 relative overflow-y-auto max-h-[90vh]"
          >
            <button onClick={() => setAddQuestionOpen(false)} className="absolute right-4 top-4 text-gray-500 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-white text-md uppercase tracking-wider mb-6">Add Manual MCQ Question</h3>

            <form onSubmit={handleAddQuestionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Question Text</label>
                <textarea
                  required
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="e.g. Which Hook is used to cache callback definitions?"
                  rows={2}
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Option 1</label>
                  <input type="text" required value={qOpt1} onChange={(e) => setQOpt1(e.target.value)} className="w-full glass-input text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Option 2</label>
                  <input type="text" required value={qOpt2} onChange={(e) => setQOpt2(e.target.value)} className="w-full glass-input text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Option 3</label>
                  <input type="text" required value={qOpt3} onChange={(e) => setQOpt3(e.target.value)} className="w-full glass-input text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Option 4</label>
                  <input type="text" required value={qOpt4} onChange={(e) => setQOpt4(e.target.value)} className="w-full glass-input text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Correct Option Index</label>
                  <select
                    value={qCorrectIndex}
                    onChange={(e) => setQCorrectIndex(parseInt(e.target.value, 10))}
                    className="w-full glass-input text-xs"
                  >
                    <option value={0}>Option 1</option>
                    <option value={1}>Option 2</option>
                    <option value={2}>Option 3</option>
                    <option value={3}>Option 4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Points</label>
                  <input
                    type="number"
                    required
                    value={qPoints}
                    onChange={(e) => setQPoints(parseInt(e.target.value, 10))}
                    className="w-full glass-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Explanation</label>
                <textarea
                  required
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  placeholder="Explain why this option is correct..."
                  rows={2}
                  className="w-full glass-input text-xs"
                />
              </div>

              <button type="submit" className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Save Question
              </button>
            </form>
          </motion.div>
        </div>
      )}
      </div>
      <Footer />
    </div>
  );
};

export default AdminPanel;
