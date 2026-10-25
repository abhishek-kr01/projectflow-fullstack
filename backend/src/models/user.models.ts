import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const userSchema = new Schema<any>(
  {
    avatar: {
      url: { type: String, default: "https://placehold.co/200x200" },
      localPath: { type: String, default: "" },
    },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, trim: true, default: "" },
    password: { type: String, required: [true, "Password is required"] },
    isEmailVerified: { type: Boolean, default: false },
    refreshToken: { type: String, default: "" },
    forgotPasswordToken: { type: String, default: undefined },
    forgotPasswordExpiry: { type: Date, default: undefined },
    emailVerificationToken: { type: String, default: undefined },
    emailVerificationExpiry: { type: Date, default: undefined },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.isPasswordCorrect = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function (): string {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new Error("ACCESS_TOKEN_SECRET is not configured");
  return jwt.sign(
    { _id: String(this._id), email: this.email, username: this.username },
    secret,
    { expiresIn: (process.env.ACCESS_TOKEN_EXPIRY || "15m") as jwt.SignOptions["expiresIn"] },
  );
};

userSchema.methods.generateRefreshToken = function (): string {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error("REFRESH_TOKEN_SECRET is not configured");
  return jwt.sign(
    { _id: String(this._id) },
    secret,
    { expiresIn: (process.env.REFRESH_TOKEN_EXPIRY || "7d") as jwt.SignOptions["expiresIn"] },
  );
};

userSchema.methods.generateTemporaryToken = function (): { unHashedToken: string; hashedToken: string; tokenExpiry: Date } {
  const unHashedToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(unHashedToken).digest("hex");
  const tokenExpiry = new Date(Date.now() + 20 * 60 * 1000);
  return { unHashedToken, hashedToken, tokenExpiry };
};

export const User = (mongoose.models.User as any) || mongoose.model<any>("User", userSchema);
