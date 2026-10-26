import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { COOKIE_NAMES } from "../utils/constants.js";
import {
  authenticateAccount,
  changeAccountPassword,
  getSafeAccount,
  registerAccount,
  requestPasswordReset,
  resetAccountPassword,
  resendAccountVerification,
  revokeAccountSession,
  rotateAccountRefreshToken,
  verifyAccountEmail,
} from "../services/auth.service.js";

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  path: "/",
});

export const registerUser = asyncHandler(async (req, res) => {
  const user = await registerAccount({
    email: String(req.body.email),
    username: String(req.body.username),
    password: String(req.body.password),
    fullName: req.body.fullName === undefined ? undefined : String(req.body.fullName),
  });
  res.status(201).json(new ApiResponse(201, { user }, "Account created. Check your email for a verification link if email delivery is configured."));
});

export const login = asyncHandler(async (req, res) => {
  const result = await authenticateAccount(String(req.body.email || ""), String(req.body.password || ""));
  res.status(200)
    .cookie(COOKIE_NAMES.ACCESS, result.accessToken, { ...cookieOptions(), maxAge: 15 * 60 * 1000 })
    .cookie(COOKIE_NAMES.REFRESH, result.refreshToken, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json(new ApiResponse(200, result, "Signed in successfully."));
});

export const logoutUser = asyncHandler(async (req, res) => {
  await revokeAccountSession(String(req.user._id));
  res.status(200)
    .clearCookie(COOKIE_NAMES.ACCESS, cookieOptions())
    .clearCookie(COOKIE_NAMES.REFRESH, cookieOptions())
    .json(new ApiResponse(200, {}, "Signed out successfully."));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await getSafeAccount(String(req.user._id));
  res.status(200).json(new ApiResponse(200, user, "Current user fetched successfully."));
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const result = await verifyAccountEmail(String(req.params.verificationToken || ""));
  res.status(200).json(new ApiResponse(200, result, "Email verified successfully."));
});

export const resendEmailVerification = asyncHandler(async (req, res) => {
  await resendAccountVerification(String(req.user._id));
  res.status(200).json(new ApiResponse(200, {}, "A verification email was requested."));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.[COOKIE_NAMES.REFRESH] || req.body?.refreshToken;
  const tokens = await rotateAccountRefreshToken(String(incomingRefreshToken || ""));
  res.status(200)
    .cookie(COOKIE_NAMES.ACCESS, tokens.accessToken, { ...cookieOptions(), maxAge: 15 * 60 * 1000 })
    .cookie(COOKIE_NAMES.REFRESH, tokens.refreshToken, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json(new ApiResponse(200, tokens, "Access token refreshed."));
});

export const forgotPasswordRequest = asyncHandler(async (req, res) => {
  await requestPasswordReset(String(req.body.email || ""));
  res.status(200).json(new ApiResponse(200, {}, "If the account exists, password reset instructions will be sent."));
});

export const resetForgotPassword = asyncHandler(async (req, res) => {
  await resetAccountPassword(String(req.params.resetToken || ""), String(req.body.newPassword || ""));
  res.status(200).json(new ApiResponse(200, {}, "Password reset successfully. Please sign in again."));
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  await changeAccountPassword(String(req.user._id), String(req.body.oldPassword || ""), String(req.body.newPassword || ""));
  res.status(200).json(new ApiResponse(200, {}, "Password changed successfully. Please sign in again."));
});
