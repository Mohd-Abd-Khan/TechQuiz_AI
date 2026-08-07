import { Schema, model, Document, Types } from 'mongoose';

export interface IQuestion extends Document {
  quizId: Types.ObjectId;
  text: string;
  options: string[]; // should be length 4 for MCQ
  correctIndex: number; // 0 to 3
  points: number;
  explanation: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    quizId: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: function (val: string[]) {
          return val.length === 4;
        },
        message: 'A question must have exactly 4 options.',
      },
    },
    correctIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
    points: {
      type: Number,
      default: 10,
    },
    explanation: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default model<IQuestion>('Question', QuestionSchema);
