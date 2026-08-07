import React, { createContext, useContext, useState, useEffect, type ReactNode, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface PlayerScore {
  username: string;
  userId: string;
  score: number;
  speedBonus: number;
  lastAnswerCorrect: boolean;
  lastAnswerOption: number;
}

export interface Player {
  socketId: string;
  userId: string;
  username: string;
  score: number;
  speedBonus: number;
  answeredCurrentQuestion: boolean;
}

export interface Room {
  code: string;
  quizId: string;
  quizTitle: string;
  questions: any[];
  players: Player[];
  hostSocketId: string;
  currentQuestionIndex: number;
  secondsRemaining: number;
  isStarted: boolean;
  isFinished: boolean;
}

export interface ChatMessage {
  username: string;
  text: string;
  timestamp: string;
}

interface SocketContextType {
  socket: Socket | null;
  room: Room | null;
  lobbyMessages: ChatMessage[];
  lastResult: { correctIndex: number; explanation: string; players: PlayerScore[] } | null;
  finalStandings: any[] | null;
  joinError: string | null;
  createMultiplayerRoom: (quizId: string, quizTitle: string, questions: any[]) => void;
  joinMultiplayerRoom: (code: string) => void;
  startMultiplayerQuiz: () => void;
  submitMultiplayerAnswer: (selectedOption: number, timeTaken: number) => void;
  sendLobbyMessage: (text: string) => void;
  leaveMultiplayerRoom: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [lobbyMessages, setLobbyMessages] = useState<ChatMessage[]>([]);
  const [lastResult, setLastResult] = useState<any | null>(null);
  const [finalStandings, setFinalStandings] = useState<any[] | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection if user is logged in
  useEffect(() => {
    if (user) {
      const socketInstance = io(SOCKET_SERVER_URL, {
        withCredentials: true,
        autoConnect: true,
      });

      socketRef.current = socketInstance;
      setSocket(socketInstance);

      // Listen for socket events
      socketInstance.on('room_created', ({ room }: { room: Room }) => {
        setRoom(room);
        setLobbyMessages([]);
        setLastResult(null);
        setFinalStandings(null);
        setJoinError(null);
      });

      socketInstance.on('room_updated', (updatedRoom: Room) => {
        setRoom(updatedRoom);
      });

      socketInstance.on('join_error', ({ message }: { message: string }) => {
        setJoinError(message);
      });

      socketInstance.on('quiz_starting', () => {
        if (room) {
          setRoom((prev) => prev ? { ...prev, isStarted: true } : null);
        }
      });

      socketInstance.on('question_started', ({ currentQuestionIndex, secondsRemaining }: any) => {
        setRoom((prev) => prev ? { ...prev, currentQuestionIndex, secondsRemaining, isStarted: true } : null);
        setLastResult(null); // clear last question correct preview
      });

      socketInstance.on('timer_update', ({ secondsRemaining }: { secondsRemaining: number }) => {
        setRoom((prev) => prev ? { ...prev, secondsRemaining } : null);
      });

      socketInstance.on('player_answered', ({ userId }: { userId: string }) => {
        setRoom((prev) => {
          if (!prev) return null;
          const updatedPlayers = prev.players.map((p) => 
            p.userId === userId ? { ...p, answeredCurrentQuestion: true } : p
          );
          return { ...prev, players: updatedPlayers };
        });
      });

      socketInstance.on('question_result', (result: any) => {
        setLastResult(result);
        // Sync player scores locally
        setRoom((prev) => {
          if (!prev) return null;
          const scoreMap = new Map<string, number>(result.players.map((p: any) => [p.userId, p.score] as [string, number]));
          const updatedPlayers = prev.players.map((p) => {
            const serverScore = scoreMap.get(p.userId);
            return {
              ...p,
              score: serverScore !== undefined ? serverScore : p.score,
              answeredCurrentQuestion: false, // reset for next round
            };
          });
          return { ...prev, players: updatedPlayers };
        });
      });

      socketInstance.on('quiz_finished', ({ finalStandings }: any) => {
        setFinalStandings(finalStandings);
        setRoom((prev) => prev ? { ...prev, isFinished: true, isStarted: false } : null);
      });

      socketInstance.on('message_received', (msg: ChatMessage) => {
        setLobbyMessages((prev) => [...prev, msg]);
      });

      return () => {
        socketInstance.disconnect();
        socketRef.current = null;
        setSocket(null);
      };
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      setRoom(null);
      setLobbyMessages([]);
      setLastResult(null);
      setFinalStandings(null);
    }
  }, [user]);

  const createMultiplayerRoom = (quizId: string, quizTitle: string, questions: any[]) => {
    if (socketRef.current && user) {
      setJoinError(null);
      socketRef.current.emit('create_room', {
        userId: user.id,
        username: user.username,
        quizId,
        quizTitle,
        questions,
      });
    }
  };

  const joinMultiplayerRoom = (code: string) => {
    if (socketRef.current && user) {
      setJoinError(null);
      socketRef.current.emit('join_room', {
        code,
        userId: user.id,
        username: user.username,
      });
    }
  };

  const startMultiplayerQuiz = () => {
    if (socketRef.current) {
      socketRef.current.emit('start_quiz');
    }
  };

  const submitMultiplayerAnswer = (selectedOption: number, timeTaken: number) => {
    if (socketRef.current) {
      socketRef.current.emit('submit_answer', { selectedOption, timeTaken });
    }
  };

  const sendLobbyMessage = (text: string) => {
    if (socketRef.current && user) {
      socketRef.current.emit('send_message', { username: user.username, text });
    }
  };

  const leaveMultiplayerRoom = () => {
    setRoom(null);
    setLobbyMessages([]);
    setLastResult(null);
    setFinalStandings(null);
    setJoinError(null);
    // Disconnect and reconnect to socket to ensure fresh room leave
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        room,
        lobbyMessages,
        lastResult,
        finalStandings,
        joinError,
        createMultiplayerRoom,
        joinMultiplayerRoom,
        startMultiplayerQuiz,
        submitMultiplayerAnswer,
        sendLobbyMessage,
        leaveMultiplayerRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
