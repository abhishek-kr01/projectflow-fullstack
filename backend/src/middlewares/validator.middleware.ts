import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const validate = asyncHandler(async (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((error: any) => ({ field: error.path, message: error.msg }));
  throw new ApiError(422, "The submitted data is not valid.", errors);
});
