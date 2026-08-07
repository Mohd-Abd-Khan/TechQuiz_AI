import { Schema, model, Document, Types } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface IChat extends Document {
  userId: Types.ObjectId;
  attemptId: Types.ObjectId;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'Attempt',
      required: true,
      index: true,
    },
    messages: [
      {
        role: {
          type: String,
          enum: ['user', 'model'],
          required: true,
        },
        text: {
          type: String,
          required: true,
          trim: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default model<IChat>('Chat', ChatSchema);
