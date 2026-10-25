import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      statusCode: error.statusCode,
      success: false,
      message: error.message,
      data: null,
      errors: error.errors,
    });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    res.status(422).json(new ApiResponse(422, null, error.message));
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ statusCode: 400, success: false, message: "Invalid resource id.", data: null });
    return;
  }

  if (error && typeof error === "object" && "code" in error && error.code === 11000) {
    res.status(409).json({ statusCode: 409, success: false, message: "A record with that value already exists.", data: null });
    return;
  }

  const status = (error as any)?.statusCode || (error as any)?.status || 500;
  const message = status < 500 ? ((error as any)?.message || "Request failed.") : "An unexpected server error occurred.";
  if (status >= 500) console.error("Unhandled API error:", error);
  res.status(status).json({ statusCode: status, success: false, message, data: null });
};
