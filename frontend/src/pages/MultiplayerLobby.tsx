import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { 
  Users, Play, Sparkles, Send, MessageSquare, 
  Clock, HelpCircle, AlertCircle, Trophy, Crown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MultiplayerLobby: React.FC = () => {
  const { user } = useAuth();
  const { 
    room, 
    lobbyMessages, 
    lastResult, 
    finalStandings, 
    joinError, 
    startMultiplayerQuiz, 
    submitMultiplayerAnswer, 
    sendLobbyMessage, 
    leaveMultiplayerRoom 
  } = useSocket();
  const navigate = useNavigate();

  const [messageText, setMessageText] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  // If user leaves or room deletes, exit
  useEffect(() => {
    if (!room && !joinError) {
      navigate('/dashboard');
    }
  }, [room, joinError, navigate]);

  // Set timing base on new questions loading
  useEffect(() => {
    if (room?.isStarted && !lastResult) {
      setQuestionStartTime(Date.now());
      setSelectedOption(null); // Reset choice
    }
  }, [room?.currentQuestionIndex, room?.isStarted, lastResult]);

  const handleStartGame = () => {
    startMultiplayerQuiz();
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendLobbyMessage(messageText);
    setMessageText('');
  };

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null || !room) return;
    setSelectedOption(idx);

    const timeTakenMs = Date.now() - questionStartTime;
    const timeTakenSec = Math.round(timeTakenMs / 1000);
    const limit = room.questions[room.currentQuestionIndex]?.timeLimit || 20;
    const finalTimeTaken = Math.min(Math.max(timeTakenSec, 1), limit);

    submitMultiplayerAnswer(idx, finalTimeTaken);
  };

  const handleExit = () => {
    leaveMultiplayerRoom();
    navigate('/dashboard');
  };

  if (!room) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Connecting to match lobby...</p>
        </div>
      </div>
    );
  }

  const isHost = room.hostSocketId === room.players.find((p) => p.userId === user?.id)?.socketId;
  const currentQuestion = room.questions[room.currentQuestionIndex];
  const totalQuestions = room.questions.length;

  /**
   * ==========================================================================
   * VIEW PHASE 1: GAME FINISHED SCOREBOARD STANDINGS
   * ==========================================================================
   */
  if (room.isFinished && finalStandings) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-between gradient-bg text-white pt-24 pb-12 px-6">
        <div className="flex-1 w-full mb-12">
          <Navbar />
          <div className="max-w-xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center justify-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-full mb-2 animate-bounce">
            <Trophy className="w-12 h-12 text-purple-400" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-glow">Match Complete!</h1>
          <p className="text-sm text-gray-400">{room.quizTitle}</p>

          {/* Standings list */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 text-left border-b border-white/5 pb-2">Final Standings</h3>
            {finalStandings.map((player, idx) => {
              const isWinner = idx === 0;
              return (
                <div key={player.userId} className={`flex items-center justify-between p-4 rounded-xl border ${
                  isWinner ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-white/2 border-white/5'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-black w-6 text-left">#{idx + 1}</span>
                    <div className="flex items-center gap-1.5">
                      {isWinner && <Crown className="w-4 h-4 fill-yellow-400" />}
                      <span className="font-bold text-sm">{player.username}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{player.score} pts</div>
                    <div className="text-[10px] text-gray-500 font-semibold">{player.speedBonus} speed bonus</div>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={handleExit} className="btn-primary w-full py-3 text-sm">
            Exit to Dashboard
          </button>
        </div>
        </div>
        <Footer />
      </div>
    );
  }

  /**
   * ==========================================================================
   * VIEW PHASE 2: ACTIVE QUESTION SCREEN
   * ==========================================================================
   */
  if (room.isStarted && currentQuestion) {
    const isSpeedBonusEligible = room.secondsRemaining / (currentQuestion.timeLimit || 20) > 0.7;

    return (
      <div className="min-h-screen gradient-bg text-white pt-24 pb-12 px-6 flex flex-col justify-center">
        <Navbar />
        <div className="max-w-3xl w-full mx-auto relative z-10">
          
          {/* Header question status */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">
                QUESTION {room.currentQuestionIndex + 1} OF {totalQuestions}
              </span>
              <h2 className="text-lg font-black text-white mt-1 line-clamp-1">{room.quizTitle}</h2>
            </div>

            {/* Sync Timer */}
            <div className="flex items-center gap-2 bg-gray-900/50 border border-white/5 py-2 px-4 rounded-xl">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="font-mono text-sm font-bold">{room.secondsRemaining}s</span>
            </div>
          </div>

          {/* Question card or Results view */}
          <AnimatePresence mode="wait">
            {lastResult ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-8 text-center space-y-6"
              >
                <div className="flex items-center justify-center mb-2">
                  <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                    Round Standings
                  </span>
                </div>
                <h3 className="text-lg font-bold">
                  Correct Answer: <span className="text-green-400">{currentQuestion.options[lastResult.correctIndex]}</span>
                </h3>
                <p className="text-gray-400 text-xs max-w-lg mx-auto italic">
                  {lastResult.explanation}
                </p>

                {/* Score standings preview */}
                <div className="max-w-md mx-auto space-y-2 text-left bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-2">Live score status</div>
                  {lastResult.players.map((p: any) => (
                    <div key={p.userId} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={p.lastAnswerCorrect ? 'text-green-400' : 'text-red-400'}>
                          {p.lastAnswerCorrect ? '✓' : '✗'}
                        </span>
                        <span>{p.username}</span>
                      </div>
                      <span className="font-bold text-gray-300">{p.score} pts</span>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-gray-500 animate-pulse">Next round starting automatically in 5s...</p>
              </motion.div>
            ) : (
              <motion.div
                key="question"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="glass-card p-8"
              >
                {/* Speed indicator */}
                {isSpeedBonusEligible && selectedOption === null && (
                  <div className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider mb-6 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 fill-green-400" />
                    <span>SPEED BONUS ACTIVE (+5 PTS)</span>
                  </div>
                )}

                <h3 className="text-base font-bold leading-relaxed mb-8 flex gap-3">
                  <HelpCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>{currentQuestion.text}</span>
                </h3>

                {/* Options grid */}
                <div className="space-y-4">
                  {currentQuestion.options.map((opt: string, idx: number) => {
                    let style = 'border-white/5 bg-gray-900/30 hover:bg-white/5 hover:border-purple-500/30 text-left';
                    if (selectedOption === idx) {
                      style = 'border-purple-500 bg-purple-600/20 text-purple-300 font-bold';
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        disabled={selectedOption !== null}
                        className={`w-full py-4 px-6 border rounded-xl text-sm transition-all cursor-pointer flex justify-between items-center ${style}`}
                      >
                        <span>{opt}</span>
                        <span className="text-gray-500 text-xs font-mono">Option {idx + 1}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Live lobby answers checklist */}
                <div className="mt-8 border-t border-white/5 pt-4">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Players Answering:</div>
                  <div className="flex flex-wrap gap-3">
                    {room.players.map((p) => (
                      <div key={p.userId} className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 ${
                        p.answeredCurrentQuestion 
                          ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                          : 'bg-white/2 border-white/5 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.answeredCurrentQuestion ? 'bg-green-400' : 'bg-gray-600 animate-pulse'}`} />
                        {p.username}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  /**
   * ==========================================================================
   * VIEW PHASE 3: MULTIPLAYER LOBBY SCREEN (Waiting for game start)
   * ==========================================================================
   */
  return (
    <div className="min-h-screen w-full flex flex-col justify-between gradient-bg text-white pt-24 pb-12 px-6">
      <div className="flex-1 w-full mb-12">
        <Navbar />
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Lobby Details and players list */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Lobby info block */}
          <div className="glass-card p-6 flex flex-col sm:flex-row justify-between items-center gap-6 border-l-4 border-l-purple-500">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">Multiplayer Lobby</span>
              <h2 className="text-xl font-bold text-white mt-1 mb-2">Lobby: {room.quizTitle}</h2>
              <p className="text-gray-400 text-xs">Share the 6-digit lobby code with your friends to start the duel.</p>
            </div>
            
            {/* Glowing Lobby Code */}
            <div className="text-center bg-purple-500/10 border border-purple-500/20 py-4 px-6 rounded-2xl flex flex-col items-center">
              <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider mb-1">Lobby Code</span>
              <span className="text-3xl font-black tracking-widest text-white font-mono text-glow select-all">
                {room.code}
              </span>
            </div>
          </div>

          {/* Players list card */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2 border-b border-white/5 pb-2">
              <Users className="w-4 h-4 text-purple-400" /> Connected Players ({room.players.length} / 5)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {room.players.map((p) => {
                const isHostPlayer = room.hostSocketId === p.socketId;
                return (
                  <div key={p.userId} className="flex items-center gap-3 bg-white/2 border border-white/5 p-4 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400">
                      {p.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm flex items-center gap-1.5">
                        {p.username}
                        {isHostPlayer && <span className="text-[8px] bg-purple-500/20 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded font-black uppercase">Host</span>}
                      </div>
                      <div className="text-[10px] text-gray-500">Ready for match</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Launch Game controls */}
            <div className="pt-6 flex gap-4">
              {isHost ? (
                <button
                  onClick={handleStartGame}
                  disabled={room.players.length < 2}
                  className="btn-primary py-3 px-6 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" /> Start Game
                </button>
              ) : (
                <div className="text-xs text-gray-500 flex items-center gap-2 p-3 bg-white/2 rounded-lg border border-white/5 w-full">
                  <AlertCircle className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span>Waiting for host to start the game match...</span>
                </div>
              )}
              <button
                onClick={handleExit}
                className="btn-secondary py-3 px-6 text-sm hover:text-red-400 hover:border-red-500/20"
              >
                Leave Room
              </button>
            </div>
            {isHost && room.players.length < 2 && (
              <p className="text-[10px] text-gray-500">Need at least 2 players in the lobby to start the duel.</p>
            )}
          </div>
        </div>

        {/* Lobby Sidebar Chat log */}
        <div className="glass-card p-6 h-[460px] flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-4">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Lobby Chat</h3>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar mb-4">
            {lobbyMessages.length === 0 ? (
              <div className="text-center py-16 text-gray-600 text-xs">
                No messages yet. Send a greeting to the lobby!
              </div>
            ) : (
              lobbyMessages.map((msg, idx) => (
                <div key={idx} className="bg-white/2 border border-white/5 p-2.5 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-purple-300">{msg.username}</span>
                    <span className="text-gray-600">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed break-all">{msg.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Input text form */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              required
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type lobby message..."
              className="flex-1 glass-input py-2 px-3 text-xs"
            />
            <button
              type="submit"
              disabled={!messageText.trim()}
              className="btn-primary p-2 flex items-center justify-center rounded-lg disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
};

export default MultiplayerLobby;
