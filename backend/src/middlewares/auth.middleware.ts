import type { RequestHandler } from "express";
import mongoose from "mongoose";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { requireProjectMembership } from "../services/project-access.service.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const authorization = req.header("Authorization");
  const token = req.cookies?.accessToken || (authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : undefined);
  if (!token) throw new ApiError(401, "Sign in to continue.");

  let decoded: string | JwtPayload;
  try {
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) throw new Error("ACCESS_TOKEN_SECRET is not configured");
    decoded = jwt.verify(token, secret);
  } catch {
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }

  if (typeof decoded === "string" || decoded.purpose === "realtime-stream" || typeof decoded._id !== "string" || !mongoose.isValidObjectId(decoded._id)) {
    throw new ApiError(401, "Invalid access token.");
  }

  const user = await User.findById(decoded._id).select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry");
  if (!user) throw new ApiError(401, "Your account could not be found. Please sign in again.");
  req.user = user;
  next();
});

export const validateProjectPermission = (roles: string[] = []): RequestHandler => asyncHandler(async (req, _res, next) => {
  const { projectId } = req.params;
  if (!projectId || !mongoose.isValidObjectId(projectId)) throw new ApiError(400, "A valid project id is required.");

  const membership = await requireProjectMembership({
    projectId,
    userId: String(req.user?._id || ""),
    allowedRoles: roles,
  });
  req.projectRole = membership.role;
  next();
});
