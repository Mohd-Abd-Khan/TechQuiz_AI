import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

interface Player {
  socketId: string;
  userId: string;
  username: string;
  score: number;
  speedBonus: number;
  answers: {
    questionId: string;
    selectedOption: number;
    isCorrect: boolean;
    timeTaken: number;
  }[];
  answeredCurrentQuestion: boolean;
}

interface Room {
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
  timerInterval: NodeJS.Timeout | null;
}

// In-memory rooms repository
const rooms: Map<string, Room> = new Map();
// Socket ID -> Room Code mapping
const socketToRoom: Map<string, string> = new Map();

export const initSocket = (server: HttpServer, clientUrl: string) => {
  const io = new Server(server, {
    cors: {
      origin: clientUrl || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  console.log('Socket.io Server initialized');

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Generate 6-digit room code
    const generateRoomCode = (): string => {
      let code = '';
      do {
        code = Math.floor(100000 + Math.random() * 900000).toString();
      } while (rooms.has(code));
      return code;
    };

    // 1. Create Room (Host)
    socket.on('create_room', ({ userId, username, quizId, quizTitle, questions }: {
      userId: string;
      username: string;
      quizId: string;
      quizTitle: string;
      questions: any[];
    }) => {
      const code = generateRoomCode();
      const newRoom: Room = {
        code,
        quizId,
        quizTitle,
        questions,
        players: [
          {
            socketId: socket.id,
            userId,
            username,
            score: 0,
            speedBonus: 0,
            answers: [],
            answeredCurrentQuestion: false,
          },
        ],
        hostSocketId: socket.id,
        currentQuestionIndex: 0,
        secondsRemaining: 0,
        isStarted: false,
        isFinished: false,
        timerInterval: null,
      };

      rooms.set(code, newRoom);
      socketToRoom.set(socket.id, code);
      socket.join(code);

      console.log(`Room ${code} created by Host: ${username} (${socket.id})`);
      socket.emit('room_created', { code, room: newRoom });
    });

    // 2. Join Room (Player)
    socket.on('join_room', ({ code, userId, username }: { code: string; userId: string; username: string }) => {
      const room = rooms.get(code);

      if (!room) {
        return socket.emit('join_error', { message: 'Room not found. Please check the 6-digit code.' });
      }

      if (room.isStarted) {
        return socket.emit('join_error', { message: 'Quiz has already started in this room.' });
      }

      if (room.players.length >= 5) {
        return socket.emit('join_error', { message: 'Room is full (max 5 players).' });
      }

      // Check if user is already in the room
      const existsIndex = room.players.findIndex((p) => p.userId === userId);
      if (existsIndex !== -1) {
        // Update socket id
        room.players[existsIndex].socketId = socket.id;
      } else {
        room.players.push({
          socketId: socket.id,
          userId,
          username,
          score: 0,
          speedBonus: 0,
          answers: [],
          answeredCurrentQuestion: false,
        });
      }

      socketToRoom.set(socket.id, code);
      socket.join(code);

      console.log(`User ${username} joined Room ${code}`);
      io.to(code).emit('room_updated', room);
    });

    // Start Question Timer
    const startQuestionTimer = (roomCode: string) => {
      const room = rooms.get(roomCode);
      if (!room || room.isFinished) return;

      const quizTimeLimit = room.questions[room.currentQuestionIndex]?.timeLimit || 20;
      room.secondsRemaining = quizTimeLimit;

      // Reset answered states for all players
      room.players.forEach((p) => {
        p.answeredCurrentQuestion = false;
      });

      io.to(roomCode).emit('question_started', {
        currentQuestionIndex: room.currentQuestionIndex,
        question: room.questions[room.currentQuestionIndex],
        secondsRemaining: room.secondsRemaining,
      });

      if (room.timerInterval) {
        clearInterval(room.timerInterval);
      }

      room.timerInterval = setInterval(() => {
        room.secondsRemaining -= 1;

        if (room.secondsRemaining <= 0) {
          clearInterval(room.timerInterval!);
          handleQuestionTimeout(roomCode);
        } else {
          io.to(roomCode).emit('timer_update', { secondsRemaining: room.secondsRemaining });
        }
      }, 1000);
    };

    // Timeout trigger
    const handleQuestionTimeout = (roomCode: string) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      // Auto-submit missed questions
      room.players.forEach((p) => {
        if (!p.answeredCurrentQuestion) {
          const currentQuestion = room.questions[room.currentQuestionIndex];
          p.answers.push({
            questionId: currentQuestion._id,
            selectedOption: -1, // skipped
            isCorrect: false,
            timeTaken: currentQuestion.timeLimit || 20,
          });
          p.answeredCurrentQuestion = true;
        }
      });

      revealQuestionResults(roomCode);
    };

    // Reveal question results
    const revealQuestionResults = (roomCode: string) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      if (room.timerInterval) {
        clearInterval(room.timerInterval);
      }

      const currentQuestion = room.questions[room.currentQuestionIndex];
      
      // Send correct answer and current scoreboard standings
      io.to(roomCode).emit('question_result', {
        correctIndex: currentQuestion.correctIndex,
        explanation: currentQuestion.explanation,
        players: room.players.map((p) => ({
          username: p.username,
          userId: p.userId,
          score: p.score,
          speedBonus: p.speedBonus,
          lastAnswerCorrect: p.answers[p.answers.length - 1]?.isCorrect || false,
          lastAnswerOption: p.answers[p.answers.length - 1]?.selectedOption ?? -1,
        })),
      });

      // Prepare transition to next question or end quiz after 5 seconds review
      setTimeout(() => {
        if (room.currentQuestionIndex + 1 < room.questions.length) {
          room.currentQuestionIndex += 1;
          startQuestionTimer(roomCode);
        } else {
          endMultiplayerQuiz(roomCode);
        }
      }, 5000);
    };

    // End Quiz
    const endMultiplayerQuiz = (roomCode: string) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      room.isFinished = true;
      room.isStarted = false;
      if (room.timerInterval) {
        clearInterval(room.timerInterval);
      }

      io.to(roomCode).emit('quiz_finished', {
        finalStandings: room.players
          .map((p) => ({
            username: p.username,
            userId: p.userId,
            score: p.score,
            speedBonus: p.speedBonus,
            answers: p.answers,
          }))
          .sort((a, b) => b.score - a.score),
      });

      // Delete room after some cleanup time
      setTimeout(() => {
        rooms.delete(roomCode);
      }, 60000); // 1 minute buffer for clients to read scoreboard
    };

    // 3. Start Quiz (Host Only)
    socket.on('start_quiz', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || room.hostSocketId !== socket.id) return;

      room.isStarted = true;
      room.currentQuestionIndex = 0;
      io.to(roomCode).emit('quiz_starting');

      setTimeout(() => {
        startQuestionTimer(roomCode);
      }, 2000); // 2 second warning
    });

    // 4. Submit Answer (Player)
    socket.on('submit_answer', ({ selectedOption, timeTaken }: { selectedOption: number; timeTaken: number }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || room.isFinished) return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player || player.answeredCurrentQuestion) return;

      const currentQuestion = room.questions[room.currentQuestionIndex];
      const isCorrect = selectedOption === currentQuestion.correctIndex;
      const questionMaxTime = currentQuestion.timeLimit || 20;

      let scoreGain = 0;
      let speedBonusGain = 0;

      if (isCorrect) {
        // Base points
        scoreGain = currentQuestion.points || 10;

        // Speed bonus: answering faster yields additional bonus points
        // E.g., if answered within 30% of time limit, get +5 speed bonus points
        const timeRatio = timeTaken / questionMaxTime;
        if (timeRatio < 0.3) {
          speedBonusGain = 5;
        } else if (timeRatio < 0.6) {
          speedBonusGain = 2;
        }
      }

      player.score += (scoreGain + speedBonusGain);
      player.speedBonus += speedBonusGain;
      player.answeredCurrentQuestion = true;
      player.answers.push({
        questionId: currentQuestion._id,
        selectedOption,
        isCorrect,
        timeTaken,
      });

      // Check if everyone has answered
      const allAnswered = room.players.every((p) => p.answeredCurrentQuestion);
      if (allAnswered) {
        revealQuestionResults(roomCode);
      } else {
        // Notify others that a player answered (shows checkmarks)
        io.to(roomCode).emit('player_answered', { userId: player.userId });
      }
    });

    // 5. Chat message in lobby
    socket.on('send_message', ({ username, text }: { username: string; text: string }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      io.to(roomCode).emit('message_received', { username, text, timestamp: new Date() });
    });

    // 6. Disconnect & Leave
    socket.on('disconnect', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      // Remove player
      room.players = room.players.filter((p) => p.socketId !== socket.id);
      socketToRoom.delete(socket.id);

      console.log(`Player left. Socket: ${socket.id}, Room: ${roomCode}`);

      if (room.players.length === 0) {
        if (room.timerInterval) {
          clearInterval(room.timerInterval);
        }
        rooms.delete(roomCode);
        console.log(`Room ${roomCode} deleted (empty)`);
      } else {
        // If host disconnected, reassign host
        if (room.hostSocketId === socket.id) {
          room.hostSocketId = room.players[0].socketId;
          console.log(`Host reassigned in Room ${roomCode} to ${room.players[0].username}`);
        }
        io.to(roomCode).emit('room_updated', room);
      }
    });
  });
};
