import { Router } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import { ProjectMember } from "../models/projectmember.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getPresenceSnapshot,
  removePresenceSession,
  subscribeProjectEvents,
  subscribeUserEvents,
  updatePresenceSession,
  type PresenceView,
} from "../utils/realtime.js";

const router = Router();

async function authenticateStreamUser(req: any) {
  const token = String(req.query.token || req.cookies?.accessToken || "");
  if (!token) throw new ApiError(401, "Realtime authentication is required.");
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new ApiError(500, "Access token secret is not configured.");
  let decoded: string | JwtPayload;
  try { decoded = jwt.verify(token, secret); } catch { throw new ApiError(401, "Realtime session expired."); }
  if (typeof decoded === "string" || typeof decoded._id !== "string" || !mongoose.isValidObjectId(decoded._id)) {
    throw new ApiError(401, "Invalid realtime token.");
  }
  const user = await User.findById(decoded._id).select("_id");
  if (!user) throw new ApiError(401, "User not found.");
  return user;
}

function initializeSse(res: any) {
  res.status(200);
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders?.();
}

// User-wide stream used by the notification bell regardless of which page is open.
router.get("/users/notifications/events", async (req, res, next) => {
  try {
    const user = await authenticateStreamUser(req);
    initializeSse(res);
    res.write(`event: connected\ndata: ${JSON.stringify({ userId: String(user._id) })}\n\n`);
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25000);
    const unsubscribe = subscribeUserEvents(String(user._id), (event) => res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
    req.on("close", () => { clearInterval(heartbeat); unsubscribe(); res.end(); });
  } catch (error) { next(error); }
});

// Presence heartbeat is per browser tab/session. Multiple tabs do not mark a user offline prematurely.
router.post("/presence", verifyJWT, async (req, res, next) => {
  try {
    const sessionId = String(req.body.sessionId || "").trim();
    if (!sessionId || sessionId.length > 120) throw new ApiError(400, "A valid presence session id is required.");
    const status = String(req.body.status || "online");
    if (status === "offline") {
      const snapshot = await removePresenceSession(String(req.user._id), sessionId);
      return res.status(200).json({ statusCode: 200, success: true, data: snapshot, message: "Presence session closed." });
    }
    const activeProjectId = req.body.activeProjectId ? String(req.body.activeProjectId) : null;
    if (activeProjectId) {
      if (!mongoose.isValidObjectId(activeProjectId)) throw new ApiError(400, "Invalid active project id.");
      const membership = await ProjectMember.exists({ project: activeProjectId, user: req.user._id });
      if (!membership) throw new ApiError(403, "You do not have access to the active project.");
    }
    const allowedViews: PresenceView[] = ["chat", "project", "dashboard", "workspace", "background"];
    const activeView = allowedViews.includes(req.body.activeView) ? req.body.activeView as PresenceView : "workspace";
    const snapshot = await updatePresenceSession({ userId: String(req.user._id), sessionId, activeProjectId, activeView });
    return res.status(200).json({ statusCode: 200, success: true, data: snapshot, message: "Presence updated." });
  } catch (error) { next(error); }
});

// Current presence list for members of a project.
router.get("/:projectId/presence", verifyJWT, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    if (!mongoose.isValidObjectId(projectId)) throw new ApiError(400, "A valid project id is required.");
    const isMember = await ProjectMember.exists({ project: projectId, user: req.user._id });
    if (!isMember) throw new ApiError(403, "You do not have access to this project.");
    const members = await ProjectMember.find({ project: projectId }).populate("user", "username fullName avatar").lean();
    const presence = members.map((member: any) => {
      const person = member.user;
      const userId = String(person?._id || member.user);
      return { ...getPresenceSnapshot(userId), user: person ? { _id: userId, username: person.username, fullName: person.fullName, avatar: person.avatar } : null };
    });
    return res.status(200).json({ statusCode: 200, success: true, data: presence, message: "Project presence fetched." });
  } catch (error) { next(error); }
});

router.get("/:projectId/events", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    if (!mongoose.isValidObjectId(projectId)) throw new ApiError(400, "A valid project id is required.");
    const user = await authenticateStreamUser(req);
    const membership = await ProjectMember.exists({ project: projectId, user: user._id });
    if (!membership) throw new ApiError(403, "You do not have access to this project.");
    initializeSse(res);
    res.write(`event: connected\ndata: ${JSON.stringify({ projectId, userId: String(user._id) })}\n\n`);
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25000);
    const unsubscribe = subscribeProjectEvents(projectId, (event) => res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
    req.on("close", () => { clearInterval(heartbeat); unsubscribe(); res.end(); });
  } catch (error) { next(error); }
});
export default router;
