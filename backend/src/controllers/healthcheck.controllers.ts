import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";

export const healthCheck = asyncHandler(async (_req, res) => {
  res.status(200).json(new ApiResponse(200, { status: "ok", service: "projectflow-api", timestamp: new Date().toISOString() }, "API is healthy."));
});
