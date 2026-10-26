import mongoose from "mongoose";
import type { RequestHandler } from "express";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { verifyRealtimeStreamToken, type RealtimeStreamScope } from "../services/realtime-token.service.js";

export const verifyRealtimeStream = (expectedScope: RealtimeStreamScope): RequestHandler => asyncHandler(async (req, _res, next) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) throw new ApiError(401, "Realtime stream token is required.");
  const claims = verifyRealtimeStreamToken(token);
  if (claims.scope !== expectedScope) throw new ApiError(403, "Realtime token scope does not match this stream.");
  const userId = claims._id;
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(401, "Invalid realtime user.");
  if (expectedScope === "project") {
    const projectId = String(req.params.projectId || "");
    if (!claims.projectId || claims.projectId !== projectId || !mongoose.isValidObjectId(projectId)) {
      throw new ApiError(403, "Realtime token is not valid for this project.");
    }
  }
  const user = await User.findById(userId).select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry");
  if (!user) throw new ApiError(401, "Realtime user no longer exists.");
  req.user = user;
  next();
});
