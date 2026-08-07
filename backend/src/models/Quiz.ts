import { Schema, model, Document, Types } from 'mongoose';

export interface IQuiz extends Document {
  title: string;
  description: string;
  category: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  timeLimitPerQuestion: number; // in seconds
  isActive: boolean;
  isDailyChallenge: boolean;
  creator: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const QuizSchema = new Schema<IQuiz>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['basic', 'intermediate', 'advanced'],
      default: 'basic',
    },
    timeLimitPerQuestion: {
      type: Number,
      default: 30, // seconds
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDailyChallenge: {
      type: Boolean,
      default: false,
      index: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default model<IQuiz>('Quiz', QuizSchema);
