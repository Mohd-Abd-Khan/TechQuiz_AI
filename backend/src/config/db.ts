import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const connUri = process.env.MONGODB_URI;
    if (!connUri) {
      console.error('CRITICAL: MONGODB_URI is not defined in the environment variables.');
      process.exit(1);
    }

    const conn = await mongoose.connect(connUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${(error as Error).message}`);
    process.exit(1);
  }
};

export default connectDB;
