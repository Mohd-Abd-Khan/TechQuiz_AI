import { Schema, model, Document, Types } from 'mongoose';

export interface IAttemptQuestion {
  questionId: Types.ObjectId;
  selectedOption: number; // 0-3 or -1 for unanswered
  isCorrect: boolean;
  timeTaken: number; // in seconds
}

export interface IAttempt extends Document {
  userId: Types.ObjectId;
  quizId: Types.ObjectId;
  questionsAttempted: IAttemptQuestion[];
  score: number;
  speedBonus: number;
  timeTaken: number; // total time in seconds
  aiFeedback: string;
  mode: 'solo';
  createdAt: Date;
  updatedAt: Date;
}

const AttemptSchema = new Schema<IAttempt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    quizId: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
    },
    questionsAttempted: [
      {
        questionId: {
          type: Schema.Types.ObjectId,
          ref: 'Question',
          required: true,
        },
        selectedOption: {
          type: Number,
          required: true,
        },
        isCorrect: {
          type: Boolean,
          required: true,
        },
        timeTaken: {
          type: Number,
          required: true,
        },
      },
    ],
    score: {
      type: Number,
      required: true,
    },
    speedBonus: {
      type: Number,
      default: 0,
    },
    timeTaken: {
      type: Number,
      required: true,
    },
    aiFeedback: {
      type: String,
      default: '',
    },
    mode: {
      type: String,
      enum: ['solo'],
      default: 'solo',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default model<IAttempt>('Attempt', AttemptSchema);
