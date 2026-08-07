import { Schema, model, Document } from 'mongoose';

export interface IOtp extends Document {
  email: string;
  otpHash: string;
  expiresAt: Date;
}

const OtpSchema = new Schema<IOtp>({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index using the value of expiresAt
  },
});

export default model<IOtp>('Otp', OtpSchema);
