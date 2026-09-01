import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import { 
  Trophy, Clock, ArrowRight, Download, BrainCircuit, 
  HelpCircle, MessageSquare, ChevronDown, ChevronUp, AlertCircle, X, Send 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from '../components/Footer';

interface QuestionAudit {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  timeTaken: number;
}

interface Attempt {
  _id: string;
  quizId: string;
  score: number;
  timeTaken: number;
  mode: 'solo';
  questionsAttempted: QuestionAudit[];
  aiFeedback?: string;
}

interface Question {
  _id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  points: number;
}

interface Quiz {
  _id: string;
  title: string;
  category: string;
  difficulty: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const QuizResult: React.FC = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  // AI Performance Analysis States
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // AI Doubt Solver States
  const [activeDoubtQuestionId, setActiveDoubtQuestionId] = useState<string | null>(null);
  const [doubtExplanation, setDoubtExplanation] = useState<string | null>(null);
  const [doubtLoading, setDoubtLoading] = useState<boolean>(false);

  // Chatbot states
  const [chatbotOpen, setChatbotOpen] = useState<boolean>(false);
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // UI States
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch attempt logs, quiz meta, and populated questions list
  useEffect(() => {
    const fetchAttemptData = async () => {
      try {
        const response = await api.get(`/quizzes/attempt/${attemptId}`);
        if (response.data?.success) {
          setAttempt(response.data.attempt);
          setQuiz(response.data.quiz);
          setQuestions(response.data.questions);

          // If feedback is cached, set it
          if (response.data.attempt.aiFeedback) {
            setAiFeedback(response.data.attempt.aiFeedback);
          }
        } else {
          setError('Attempt log details not found.');
        }
      } catch (err) {
        console.error('Failed to load attempt summary:', err);
        setError('Failed to retrieve quiz metrics. Please return to dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchAttemptData();
  }, [attemptId]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  // Lazy-load Performance Analysis if not cached
  const triggerPerformanceAnalysis = async () => {
    if (aiFeedback || aiLoading || !attempt) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const response = await api.get(`/ai/analyze-attempt/${attempt._id}`);
      if (response.data?.success) {
        setAiFeedback(response.data.feedback);
        // Sync local attempt
        setAttempt((prev) => prev ? { ...prev, aiFeedback: response.data.feedback } : null);
      }
    } catch (err: any) {
      setAiError(err.response?.data?.message || 'AI Performance Analyzer is temporarily rate-limited. Retry soon.');
    } finally {
      setAiLoading(false);
    }
  };

  // Launch Puppeteer PDF summary compiler
  const handleDownloadPdf = async () => {
    if (downloadingPdf || !attempt) return;
    setDownloadingPdf(true);

    try {
      const response = await api.get(`/quizzes/attempt/${attempt._id}/pdf`, {
        responseType: 'blob', // receive binary PDF buffer
      });

      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileUrl = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', `study-notes-${quiz?.title.replace(/\s+/g, '-') || 'quiz'}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('PDF generation query failed:', err);
      alert('Could not export PDF guide. Ensure backend is running Puppeteer correctly.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Explains specific wrong answer via AI Doubt Solver (Solo Only)
  const handleAskDoubtSolver = async (question: Question, selectedIndex: number) => {
    if (doubtLoading || !attempt) return;
    setActiveDoubtQuestionId(question._id);
    setDoubtExplanation(null);
    setDoubtLoading(true);

    try {
      const response = await api.post('/ai/doubt-solver', {
        attemptId: attempt._id,
        questionId: question._id,
        selectedOption: selectedIndex,
      });

      if (response.data?.success) {
        setDoubtExplanation(response.data.explanation);
      }
    } catch (err: any) {
      setDoubtExplanation(err.response?.data?.message || 'AI Doubt solver failed due to rate limiting.');
    } finally {
      setDoubtLoading(false);
    }
  };

  // Toggles question card expand
  const toggleQuestionExpand = (qId: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  // AI Chatbot send message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading || !attempt) return;

    const userText = chatMessage;
    setChatMessage('');
    setChatLoading(true);

    // Optimistically add user message
    setChatHistory((prev) => [...prev, { role: 'user', text: userText }]);

    try {
      const response = await api.post('/ai/chat-tutor', {
        attemptId: attempt._id,
        message: userText,
      });

      if (response.data?.success) {
        setChatHistory(response.data.messages);
      }
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'model', text: err.response?.data?.message || 'Chatbot rate limit exceeded. Please wait a bit.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Compiling quiz results...</p>
        </div>
      </div>
    );
  }

  if (error || !attempt || !quiz) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white px-6">
        <div className="max-w-md w-full glass-card p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Metrics Error</h3>
          <p className="text-gray-400 text-sm mb-6">{error || 'Attempt log not found.'}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary w-full">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Calculate Accuracy Percentages
  const correctCount = attempt.questionsAttempted.filter((q) => q.isCorrect).length;
  const accuracy = Math.round((correctCount / attempt.questionsAttempted.length) * 100);

  // Group questions by attempt arrays
  const attemptMap = new Map(attempt.questionsAttempted.map((a) => [a.questionId, a]));

  return (
    <div className="min-h-screen w-full flex flex-col justify-between gradient-bg text-white pt-24 pb-12 px-6">
      <div className="flex-1 w-full mb-12">
        <Navbar />
        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        
        {/* Scorecard Hero Section */}
        <div className="glass-card p-8 text-center relative overflow-hidden border border-purple-500/20">
          <div className="absolute -right-24 -top-24 w-60 h-60 bg-purple-500/10 rounded-full blur-[80px]" />
          <div className="absolute -left-24 -bottom-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-[80px]" />

          <div className="inline-flex items-center justify-center p-4 bg-purple-500/10 rounded-full border border-purple-500/20 mb-4 animate-bounce">
            <Trophy className="w-10 h-10 text-purple-400" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Quiz Complete!</h1>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">{quiz.title}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mt-6">
            <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Final Score</div>
              <div className="text-2xl font-black text-purple-400 mt-1">{attempt.score} pts</div>
            </div>
            <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Accuracy</div>
              <div className="text-2xl font-black text-green-400 mt-1">{accuracy}%</div>
            </div>
            <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Time Taken</div>
              <div className="text-2xl font-black text-indigo-400 mt-1 flex items-center justify-center gap-1">
                <Clock className="w-5 h-5" /> {attempt.timeTaken}s
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="btn-primary flex items-center justify-center gap-2 py-3 px-6 text-sm"
            >
              <Download className="w-4 h-4" /> {downloadingPdf ? 'Exporting PDF...' : 'Download Study Notes'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary flex items-center justify-center gap-2 py-3 px-6 text-sm"
            >
              Return Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Performance Analysis Section */}
        <div className="glass-card p-6 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-md">AI Performance Review</h3>
              </div>
              {!aiFeedback && !aiLoading && (
                <button
                  onClick={triggerPerformanceAnalysis}
                  className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
                >
                  Analyze My Score
                </button>
              )}
            </div>

            {aiLoading && (
              <div className="py-8 text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-gray-500">Gemini is auditing weak topics and generating customized guidelines...</p>
              </div>
            )}

            {aiError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{aiError}</span>
              </div>
            )}

            {aiFeedback && (
              <div className="prose prose-invert max-w-none text-xs text-gray-300 leading-relaxed space-y-2 whitespace-pre-line bg-white/5 p-4 rounded-xl border border-white/5">
                {aiFeedback}
              </div>
            )}

            {!aiFeedback && !aiLoading && !aiError && (
              <p className="text-gray-400 text-xs">
                Get personalized analysis on weak topics, recommendations, and motivational study guidance compiled directly by Gemini. Click the "Analyze My Score" button above.
              </p>
            )}
          </div>

        {/* Question Audit Breakdown */}
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-400" /> Question-Level Review
          </h2>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const audit = attemptMap.get(q._id) as QuestionAudit;
              if (!audit) return null;

              const isExpanded = !!expandedQuestions[q._id];
              const isCorrect = audit.isCorrect;

              return (
                <div
                  key={q._id}
                  className={`glass-card overflow-hidden border ${
                    isCorrect ? 'border-green-500/10' : 'border-red-500/10'
                  }`}
                >
                  {/* Collapsed Header */}
                  <div
                    onClick={() => toggleQuestionExpand(q._id)}
                    className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCorrect ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {isCorrect ? '✓' : '✗'}
                      </span>
                      <span className="text-sm font-semibold text-white line-clamp-1">
                        Question {idx + 1}: {q.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-semibold uppercase font-mono">{audit.timeTaken}s</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </div>

                  {/* Expanded Content Details */}
                  {isExpanded && (
                    <div className="p-5 border-t border-white/5 bg-gray-900/10 space-y-4">
                      <p className="text-sm font-medium text-white">{q.text}</p>
                      
                      {/* Choices option cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((opt, optIdx) => {
                          let cardStyle = 'border-white/5 bg-gray-900/30 text-gray-400';
                          if (q.correctIndex === optIdx) {
                            cardStyle = 'border-green-500/30 bg-green-500/10 text-green-400 font-bold';
                          } else if (audit.selectedOption === optIdx && !isCorrect) {
                            cardStyle = 'border-red-500/30 bg-red-500/10 text-red-400 line-through';
                          }

                          return (
                            <div key={optIdx} className={`p-3 border rounded-lg text-xs ${cardStyle}`}>
                              {optIdx + 1}. {opt}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      <div className="bg-white/2 border border-white/5 p-4 rounded-lg text-xs text-gray-400">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>

                      {/* AI Doubt solver button */}
                      <div className="pt-2">
                          <button
                            onClick={() => handleAskDoubtSolver(q, audit.selectedOption)}
                            disabled={doubtLoading}
                            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 hover:text-purple-400 hover:border-purple-500/30"
                          >
                            <BrainCircuit className="w-3.5 h-3.5" /> Explain with AI Analyst
                          </button>

                          {/* Doubt explanation popover popup */}
                          {activeDoubtQuestionId === q._id && (
                            <div className="mt-4 p-4 bg-purple-500/5 border border-purple-500/15 rounded-xl space-y-2">
                              {doubtLoading && (
                                <div className="py-4 text-center">
                                  <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                  <span className="text-[10px] text-gray-500">Querying doubts solving analogy...</span>
                                </div>
                              )}
                              {doubtExplanation && (
                                <div className="text-xs text-gray-300 whitespace-pre-line leading-relaxed">
                                  {doubtExplanation}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating AI Chatbot Tutor widget */}
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
              {chatbotOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 50, scale: 0.95 }}
                  className="w-80 sm:w-96 h-[480px] glass-card flex flex-col overflow-hidden border border-purple-500/30 shadow-2xl relative"
                >
                  {/* Chat header */}
                  <div className="bg-purple-600 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-white" />
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Chatbot Tutor</h4>
                        <span className="text-[9px] text-purple-200">Interactive Quiz Explainer</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setChatbotOpen(false)}
                      className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Messages log */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 no-scrollbar bg-slate-950/20">
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[10px] font-black flex-shrink-0">
                        AI
                      </div>
                      <div className="bg-white/5 border border-white/5 px-3 py-2 rounded-xl text-xs max-w-[80%] leading-relaxed">
                        Hey! Feel free to ask any technical follow-up questions about this quiz's concepts or sample codes!
                      </div>
                    </div>

                    {chatHistory.map((msg, index) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div key={index} className={`flex gap-2 ${isUser ? 'justify-end' : ''}`}>
                          {!isUser && (
                            <div className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[10px] font-black flex-shrink-0">
                              AI
                            </div>
                          )}
                          <div className={`${
                            isUser 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-white/5 border border-white/5'
                          } px-3 py-2 rounded-xl text-xs max-w-[80%] leading-relaxed whitespace-pre-line`}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}

                    {chatLoading && (
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[10px] font-black flex-shrink-0 animate-pulse">
                          AI
                        </div>
                        <div className="bg-white/5 border border-white/5 px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-100" />
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-200" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input form */}
                  <form onSubmit={handleSendChatMessage} className="p-3 border-t border-white/5 bg-gray-950/40 flex gap-2">
                    <input
                      type="text"
                      required
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Ask follow-up code examples..."
                      className="flex-1 glass-input py-2 px-3 text-xs"
                      disabled={chatLoading}
                    />
                    <button
                      type="submit"
                      disabled={!chatMessage.trim() || chatLoading}
                      className="btn-primary p-2 flex items-center justify-center rounded-lg disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.button
                  layoutId="tutorBubble"
                  onClick={() => setChatbotOpen(true)}
                  className="bg-purple-600 hover:bg-purple-500 p-4 rounded-full text-white shadow-2xl hover:shadow-purple-600/30 transition-all flex items-center justify-center border border-purple-400/20 cursor-pointer text-glow"
                >
                  <MessageSquare className="w-6 h-6" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default QuizResult;
