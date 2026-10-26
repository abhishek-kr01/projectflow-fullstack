import mongoose from "mongoose";
import { createRealtimeStreamToken, type RealtimeStreamScope } from "../services/realtime-token.service.js";
import { requireProjectMembership } from "../services/project-access.service.js";
import type { RequestHandler } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { createSseStream } from "../utils/sse.js";
import { subscribeProjectEvents, subscribeUserEvents } from "../services/realtime.service.js";
import { listProjectPresence, removePresenceSession, updatePresenceSession, type PresenceView } from "../services/presence.service.js";

const allowedViews: readonly PresenceView[] = ["chat", "project", "dashboard", "workspace", "background"];

export const createStreamToken: RequestHandler = asyncHandler(async (req, res) => {
  const userId = String(req.user?._id || "");
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(401, "Sign in to continue.");
  const scope = String(req.body?.scope || "") as RealtimeStreamScope;
  if (scope !== "project" && scope !== "notifications") throw new ApiError(400, "Stream scope must be project or notifications.");
  const rawProjectId = req.body?.projectId;
  let projectId: string | undefined;
  if (scope === "project") {
    projectId = String(rawProjectId || "");
    if (!mongoose.isValidObjectId(projectId)) throw new ApiError(400, "A valid project id is required for a project stream.");
    await requireProjectMembership({ projectId, userId });
  } else if (rawProjectId) {
    throw new ApiError(400, "Notification stream tokens cannot be scoped to a project.");
  }
  const token = createRealtimeStreamToken({ userId, scope, projectId });
  res.status(200).json(new ApiResponse(200, token, "Realtime stream token created."));
});

export const streamUserNotifications: RequestHandler = asyncHandler(async (req, res) => {
  const userId = String(req.user?._id || "");
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(401, "Sign in to continue.");

  const stream = createSseStream(res);
  const unsubscribe = subscribeUserEvents(userId, (event) => { stream.send(event.type, event); });
  stream.onClose(unsubscribe);
  stream.send("connected", { userId });
});

export const updatePresence: RequestHandler = asyncHandler(async (req, res) => {
  const userId = String(req.user?._id || "");
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(401, "Sign in to continue.");
  const sessionId = String(req.body?.sessionId || "").trim();
  if (!sessionId || sessionId.length > 120) throw new ApiError(400, "A valid presence session id is required.");
  const status = String(req.body?.status || "online");
  if (status !== "online" && status !== "offline") throw new ApiError(400, "Presence status must be online or offline.");

  if (status === "offline") {
    const snapshot = await removePresenceSession(userId, sessionId);
    res.status(200).json(new ApiResponse(200, snapshot, "Presence session closed."));
    return;
  }

  const rawProjectId = req.body?.activeProjectId;
  const activeProjectId = rawProjectId ? String(rawProjectId) : null;
  if (activeProjectId && !mongoose.isValidObjectId(activeProjectId)) throw new ApiError(400, "Invalid active project id.");
  const rawView = req.body?.activeView;
  if (rawView !== undefined && !allowedViews.includes(rawView)) throw new ApiError(400, "Invalid presence view.");

  const snapshot = await updatePresenceSession({
    userId,
    sessionId,
    activeProjectId,
    activeView: (rawView || "workspace") as PresenceView,
  });
  res.status(200).json(new ApiResponse(200, snapshot, "Presence updated."));
});

export const getProjectPresence: RequestHandler = asyncHandler(async (req, res) => {
  const projectId = String(req.params.projectId || "");
  if (!mongoose.isValidObjectId(projectId)) throw new ApiError(400, "A valid project id is required.");
  const presence = await listProjectPresence(projectId);
  res.status(200).json(new ApiResponse(200, presence, "Project presence fetched."));
});

export const streamProjectEvents: RequestHandler = asyncHandler(async (req, res) => {
  const projectId = String(req.params.projectId || "");
  const userId = String(req.user?._id || "");
  if (!mongoose.isValidObjectId(projectId)) throw new ApiError(400, "A valid project id is required.");
  if (!mongoose.isValidObjectId(userId)) throw new ApiError(401, "Sign in to continue.");

  const stream = createSseStream(res);
  const unsubscribe = subscribeProjectEvents(projectId, (event) => {
    if (event.type === "member:removed") {
      const payload = event.payload as { userId?: unknown } | null;
      if (String(payload?.userId || "") === userId) {
        stream.send("access:revoked", { projectId, reason: "membership_removed" });
        stream.close();
        return;
      }
    }
    stream.send(event.type, event);
  });
  stream.onClose(unsubscribe);
  stream.send("connected", { projectId, userId });
});
