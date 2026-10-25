import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail } from "../utils/mail.js";
import { COOKIE_NAMES } from "../utils/constants.js";

const userSafeSelect = "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry";
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  path: "/",
});
const frontendUrl = () => (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

const generateAccessAndRefreshTokens = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "Account not found.");
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

const trySendEmail = async (to: string, subject: string, content: any) => {
  try {
    await sendEmail({ email: to, subject, mailgenContent: content });
  } catch (error) {
    // Keep account state consistent if SMTP is temporarily unavailable. The server log gives operators the cause.
    console.error("Could not send account email:", error);
  }
};

export const registerUser = asyncHandler(async (req, res) => {
  const email = String(req.body.email).trim().toLowerCase();
  const username = String(req.body.username).trim().toLowerCase();
  const { password, fullName } = req.body;

  const existing = await User.findOne({ $or: [{ email }, { username }] }).select("_id");
  if (existing) throw new ApiError(409, "An account with this email or username already exists.");

  const user = await User.create({ email, username, password, fullName: String(fullName || "").trim(), isEmailVerified: false });
  const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  const verificationUrl = `${frontendUrl()}/verify-email/${unHashedToken}`;
  await trySendEmail(user.email, "Verify your ProjectFlow email", emailVerificationMailgenContent(user.username, verificationUrl));

  const safeUser = await User.findById(user._id).select(userSafeSelect);
  return res.status(201).json(new ApiResponse(201, { user: safeUser }, "Account created. Check your email for a verification link if email delivery is configured."));
});

export const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const { password } = req.body;
  if (!email || !password) throw new ApiError(400, "Email and password are required.");

  const user = await User.findOne({ email });
  if (!user || !(await user.isPasswordCorrect(password))) throw new ApiError(401, "Email or password is incorrect.");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(String(user._id));
  const safeUser = await User.findById(user._id).select(userSafeSelect);
  return res.status(200)
    .cookie(COOKIE_NAMES.ACCESS, accessToken, { ...cookieOptions(), maxAge: 15 * 60 * 1000 })
    .cookie(COOKIE_NAMES.REFRESH, refreshToken, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json(new ApiResponse(200, { user: safeUser, accessToken, refreshToken }, "Signed in successfully."));
});

export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: "" } });
  return res.status(200)
    .clearCookie(COOKIE_NAMES.ACCESS, cookieOptions())
    .clearCookie(COOKIE_NAMES.REFRESH, cookieOptions())
    .json(new ApiResponse(200, {}, "Signed out successfully."));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(userSafeSelect);
  if (!user) throw new ApiError(404, "Account not found.");
  return res.status(200).json(new ApiResponse(200, user, "Current user fetched successfully."));
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;
  if (!verificationToken) throw new ApiError(400, "Email verification token is required.");
  const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
  const user = await User.findOne({ emailVerificationToken: hashedToken, emailVerificationExpiry: { $gt: new Date() } });
  if (!user) throw new ApiError(400, "This email verification link is invalid or has expired.");

  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });
  return res.status(200).json(new ApiResponse(200, { isEmailVerified: true }, "Email verified successfully."));
});

export const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "Account not found.");
  if (user.isEmailVerified) throw new ApiError(409, "This email address is already verified.");

  const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  await trySendEmail(user.email, "Verify your ProjectFlow email", emailVerificationMailgenContent(user.username, `${frontendUrl()}/verify-email/${unHashedToken}`));
  return res.status(200).json(new ApiResponse(200, {}, "A verification email was requested."));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.[COOKIE_NAMES.REFRESH] || req.body?.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, "A refresh token is required.");
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new ApiError(500, "Refresh token configuration is missing.");

  let decoded: any;
  try {
    decoded = jwt.verify(incomingRefreshToken, secret);
  } catch {
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }
  if (!decoded?._id) throw new ApiError(401, "Invalid refresh token.");
  const user = await User.findById(decoded._id);
  if (!user || user.refreshToken !== incomingRefreshToken) throw new ApiError(401, "Refresh token is no longer valid. Please sign in again.");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(String(user._id));
  return res.status(200)
    .cookie(COOKIE_NAMES.ACCESS, accessToken, { ...cookieOptions(), maxAge: 15 * 60 * 1000 })
    .cookie(COOKIE_NAMES.REFRESH, refreshToken, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json(new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed."));
});

export const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const user = await User.findOne({ email });
  // Avoid disclosing whether an email address has an account.
  if (!user) return res.status(200).json(new ApiResponse(200, {}, "If the account exists, password reset instructions will be sent."));

  const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  const resetBase = (process.env.FORGOT_PASSWORD_REDIRECT_URL || `${frontendUrl()}/reset-password`).replace(/\/$/, "");
  await trySendEmail(user.email, "Reset your ProjectFlow password", forgotPasswordMailgenContent(user.username, `${resetBase}/${unHashedToken}`));
  return res.status(200).json(new ApiResponse(200, {}, "If the account exists, password reset instructions will be sent."));
});

export const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  const user = await User.findOne({ forgotPasswordToken: hashedToken, forgotPasswordExpiry: { $gt: new Date() } });
  if (!user) throw new ApiError(400, "This password reset link is invalid or has expired.");

  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;
  user.password = newPassword;
  user.refreshToken = "";
  await user.save();
  return res.status(200).json(new ApiResponse(200, {}, "Password reset successfully. Please sign in again."));
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "Account not found.");
  if (!(await user.isPasswordCorrect(oldPassword))) throw new ApiError(400, "Your current password is incorrect.");
  user.password = newPassword;
  user.refreshToken = "";
  await user.save();
  return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully. Please sign in again."));
});
