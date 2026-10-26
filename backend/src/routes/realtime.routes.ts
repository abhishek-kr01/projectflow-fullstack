import { Router } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import { ProjectMember } from "../models/projectmember.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { subscribeProjectEvents } from "../utils/realtime.js";

const router = Router();
router.get("/:projectId/events", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    if (!mongoose.isValidObjectId(projectId)) throw new ApiError(400, "A valid project id is required.");
    const token = String(req.query.token || "");
    if (!token) throw new ApiError(401, "Realtime authentication is required.");
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) throw new ApiError(500, "Access token secret is not configured.");
    let decoded: string | JwtPayload;
    try { decoded = jwt.verify(token, secret); } catch { throw new ApiError(401, "Realtime session expired."); }
    if (typeof decoded === "string" || typeof decoded._id !== "string") throw new ApiError(401, "Invalid realtime token.");
    const user = await User.findById(decoded._id).select("_id");
    if (!user) throw new ApiError(401, "User not found.");
    const membership = await ProjectMember.exists({ project: projectId, user: user._id });
    if (!membership) throw new ApiError(403, "You do not have access to this project.");
    res.status(200);
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.flushHeaders?.();
    res.write(`event: connected\ndata: ${JSON.stringify({ projectId, userId: String(user._id) })}\n\n`);
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25000);
    const unsubscribe = subscribeProjectEvents(projectId, (event) => res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
    req.on("close", () => { clearInterval(heartbeat); unsubscribe(); res.end(); });
  } catch (error) { next(error); }
});
export default router;
