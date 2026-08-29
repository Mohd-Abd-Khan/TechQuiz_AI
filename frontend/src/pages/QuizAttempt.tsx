import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import { HelpCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
  _id: string;
  text: string;
  options: string[];
  points: number;
}

interface Quiz {
  _id: string;
  title: string;
  category: string;
  difficulty: string;
  timeLimitPerQuestion: number;
}

const QuizAttempt: React.FC = () => {
  const { id: quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);

  // Timer States
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartTimeRef = useRef<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch quiz details and questions
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await api.get(`/quizzes/${quizId}`);
        if (response.data?.success) {
          setQuiz(response.data.quiz);
          setQuestions(response.data.questions);
          setSecondsLeft(response.data.quiz.timeLimitPerQuestion || 30);
        } else {
          setError('Quiz not found.');
        }
      } catch (err) {
        console.error('Failed to load quiz attempt:', err);
        setError('Failed to initialize quiz. Please return to dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizId]);

  // Start question countdown
  useEffect(() => {
    if (questions.length === 0 || !quiz) return;

    // Set start timestamp to measure exact timeTaken in ms
    questionStartTimeRef.current = Date.now();
    setSelectedOpt(null);
    setSecondsLeft(quiz.timeLimitPerQuestion || 30);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIdx, questions, quiz]);

  const handleTimeout = () => {
    // Save skipped answer
    const currentQ = questions[currentIdx];
    const timeTaken = quiz?.timeLimitPerQuestion || 30;

    const newAnswer = {
      questionId: currentQ._id,
      selectedOption: -1, // skipped
      timeTaken,
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      submitQuiz(updatedAnswers);
    }
  };

  const handleOptionSelect = (optIdx: number) => {
    if (selectedOpt !== null) return; // prevent multiple clicks
    setSelectedOpt(optIdx);

    if (timerRef.current) clearInterval(timerRef.current);

    const timeTakenMs = Date.now() - questionStartTimeRef.current;
    const timeTakenSec = Math.round(timeTakenMs / 1000);
    const limit = quiz?.timeLimitPerQuestion || 30;
    const finalTimeTaken = Math.min(Math.max(timeTakenSec, 1), limit); // clamp

    const currentQ = questions[currentIdx];
    const newAnswer = {
      questionId: currentQ._id,
      selectedOption: optIdx,
      timeTaken: finalTimeTaken,
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    // Short delay for visual selection click
    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx((prev) => prev + 1);
      } else {
        submitQuiz(updatedAnswers);
      }
    }, 800);
  };

  const submitQuiz = async (finalAnswers: any[]) => {
    setLoading(true);
    try {
      const response = await api.post(`/quizzes/${quizId}/submit`, {
        answers: finalAnswers,
        mode: 'solo',
      });

      if (response.data?.success) {
        navigate(`/quiz/result/${response.data.attempt._id}`, {
          state: {
            scoreDetails: response.data,
          },
        });
      } else {
        setError('Failed to submit quiz.');
      }
    } catch (err) {
      console.error('Quiz submission error:', err);
      setError('An error occurred during submission. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && questions.length === 0) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading quiz questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white px-6">
        <div className="max-w-md w-full glass-card p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Error Occurred</h3>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary w-full">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const totalQuestions = questions.length;
  const timeLimit = quiz?.timeLimitPerQuestion || 30;
  


  return (
    <div className="min-h-screen gradient-bg text-white pt-24 pb-12 px-6 flex flex-col justify-center">
      <Navbar />

      <div className="max-w-3xl w-full mx-auto relative z-10">
        {/* Progress header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs font-bold tracking-widest text-purple-400 uppercase">
              {quiz?.category} • QUESTION {currentIdx + 1} OF {totalQuestions}
            </span>
            <h1 className="text-xl font-bold text-white mt-1 line-clamp-1">{quiz?.title}</h1>
          </div>

          {/* SVG Circular Timer */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="26"
                className="stroke-gray-800"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r="26"
                className={`transition-all duration-1000 ${
                  secondsLeft <= 5 ? 'stroke-red-500' : 'stroke-purple-500'
                }`}
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 26}
                strokeDashoffset={2 * Math.PI * 26 - (secondsLeft / timeLimit) * (2 * Math.PI * 26)}
              />
            </svg>
            <span className="absolute text-sm font-bold font-mono">{secondsLeft}s</span>
          </div>
        </div>

        {/* Question Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-8 mb-6"
          >

            <h2 className="text-lg font-bold leading-relaxed mb-8 flex gap-3">
              <HelpCircle className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
              <span>{currentQuestion?.text}</span>
            </h2>

            {/* Answer Options Grid */}
            <div className="space-y-4">
              {currentQuestion?.options.map((opt, idx) => {
                let btnStyle = 'border-white/5 bg-gray-900/30 hover:bg-white/5 hover:border-purple-500/30 text-left';
                if (selectedOpt === idx) {
                  btnStyle = 'border-purple-500 bg-purple-600/20 text-purple-300 font-bold';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    disabled={selectedOpt !== null}
                    className={`w-full py-4 px-6 border rounded-xl text-sm transition-all duration-150 cursor-pointer flex justify-between items-center ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    <span className="text-gray-500 text-xs font-mono">Option {idx + 1}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer info progress indicators */}
        <div className="flex justify-between items-center text-xs text-gray-500 font-semibold uppercase tracking-wider">
          <span>Single Player Mode</span>
          <span>{Math.round(((currentIdx + 1) / totalQuestions) * 100)}% Complete</span>
        </div>
      </div>
    </div>
  );
};

export default QuizAttempt;
