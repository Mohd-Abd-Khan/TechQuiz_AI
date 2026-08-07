import { Schema, model, Document } from 'mongoose';

export interface IBadge extends Document {
  badgeId: string; // e.g., 'first_quiz', 'speed_demon'
  name: string;
  description: string;
  iconCode: string; // identifier for frontend lucide icons
  unlockCondition: string;
  createdAt: Date;
  updatedAt: Date;
}

const BadgeSchema = new Schema<IBadge>(
  {
    badgeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    iconCode: {
      type: String,
      required: true,
    },
    unlockCondition: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default model<IBadge>('Badge', BadgeSchema);
