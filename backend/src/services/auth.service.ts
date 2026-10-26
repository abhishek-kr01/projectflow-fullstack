import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
} from "../utils/mail.js";

const userSafeSelect = "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry";
const frontendUrl = () => (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

async function trySendEmail(to: string, subject: string, mailgenContent: { body: Record<string, unknown> }): Promise<boolean> {
  try {
    await sendEmail({ email: to, subject, mailgenContent });
    return true;
  } catch (error) {
    console.error("Could not send account email:", error);
    return false;
  }
}

export async function generateAccessAndRefreshTokens(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "Account not found.");
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
}

export async function registerAccount(input: { email: string; username: string; password: string; fullName?: string }) {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  const existing = await User.findOne({ $or: [{ email }, { username }] }).select("_id");
  if (existing) throw new ApiError(409, "An account with this email or username already exists.");

  const user = await User.create({ email, username, password: input.password, fullName: String(input.fullName || "").trim(), isEmailVerified: false });
  const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  const verificationUrl = `${frontendUrl()}/verify-email/${unHashedToken}`;
  await trySendEmail(user.email, "Verify your ProjectFlow email", emailVerificationMailgenContent(user.username, verificationUrl));
  return User.findById(user._id).select(userSafeSelect);
}

export async function authenticateAccount(emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  if (!email || !password) throw new ApiError(400, "Email and password are required.");
  const user = await User.findOne({ email });
  if (!user || !(await user.isPasswordCorrect(password))) throw new ApiError(401, "Email or password is incorrect.");
  const tokens = await generateAccessAndRefreshTokens(String(user._id));
  const safeUser = await User.findById(user._id).select(userSafeSelect);
  return { user: safeUser, ...tokens };
}

export async function revokeAccountSession(userId: string) {
  await User.findByIdAndUpdate(userId, { $set: { refreshToken: "" } });
}

export async function getSafeAccount(userId: string) {
  const user = await User.findById(userId).select(userSafeSelect);
  if (!user) throw new ApiError(404, "Account not found.");
  return user;
}

export async function verifyAccountEmail(verificationToken: string) {
  if (!verificationToken) throw new ApiError(400, "Email verification token is required.");
  const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
  const user = await User.findOne({ emailVerificationToken: hashedToken, emailVerificationExpiry: { $gt: new Date() } });
  if (!user) throw new ApiError(400, "This email verification link is invalid or has expired.");
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });
  return { isEmailVerified: true };
}

export async function resendAccountVerification(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "Account not found.");
  if (user.isEmailVerified) throw new ApiError(409, "This email address is already verified.");
  const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });
  await trySendEmail(user.email, "Verify your ProjectFlow email", emailVerificationMailgenContent(user.username, `${frontendUrl()}/verify-email/${unHashedToken}`));
}

export async function rotateAccountRefreshToken(incomingRefreshToken: string) {
  if (!incomingRefreshToken) throw new ApiError(401, "A refresh token is required.");
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new ApiError(500, "Refresh token configuration is missing.");
  let decoded: any;
  try { decoded = jwt.verify(incomingRefreshToken, secret); }
  catch { throw new ApiError(401, "Your session has expired. Please sign in again."); }
  if (!decoded?._id) throw new ApiError(401, "Invalid refresh token.");
  const user = await User.findById(decoded._id);
  if (!user || user.refreshToken !== incomingRefreshToken) throw new ApiError(401, "Refresh token is no longer valid. Please sign in again.");
  return generateAccessAndRefreshTokens(String(user._id));
}

export async function requestPasswordReset(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  const user = await User.findOne({ email });
  // Do not reveal whether a user exists.
  if (!user) return;
  const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });
  const resetBase = (process.env.FORGOT_PASSWORD_REDIRECT_URL || `${frontendUrl()}/reset-password`).replace(/\/$/, "");
  await trySendEmail(user.email, "Reset your ProjectFlow password", forgotPasswordMailgenContent(user.username, `${resetBase}/${unHashedToken}`));
}

export async function resetAccountPassword(resetToken: string, newPassword: string) {
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  const user = await User.findOne({ forgotPasswordToken: hashedToken, forgotPasswordExpiry: { $gt: new Date() } });
  if (!user) throw new ApiError(400, "This password reset link is invalid or has expired.");
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;
  user.password = newPassword;
  user.refreshToken = "";
  await user.save();
}

export async function changeAccountPassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "Account not found.");
  if (!(await user.isPasswordCorrect(oldPassword))) throw new ApiError(400, "Your current password is incorrect.");
  user.password = newPassword;
  user.refreshToken = "";
  await user.save();
}
