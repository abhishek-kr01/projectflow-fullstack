import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not configured. Add it to backend/.env or your Render environment variables.");
  await mongoose.connect(uri);
  console.log("✅ MongoDB connected");
};

export default connectDB;
