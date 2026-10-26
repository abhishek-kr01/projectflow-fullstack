import { Router } from "express";
import {
  createStreamToken,
  getProjectPresence,
  streamProjectEvents,
  streamUserNotifications,
  updatePresence,
} from "../controllers/realtime.controllers.js";
import { verifyJWT, validateProjectPermission } from "../middlewares/auth.middleware.js";
import { verifyRealtimeStream } from "../middlewares/realtime-stream.middleware.js";
import { AvailableUserRole } from "../utils/constants.js";

const router = Router();

// Regular API auth is used to mint short-lived, read-only SSE credentials.
router.post("/stream-token", verifyJWT, createStreamToken);
router.get("/users/notifications/events", verifyRealtimeStream("notifications"), streamUserNotifications);
router.post("/presence", verifyJWT, updatePresence);
router.get("/:projectId/presence", verifyJWT, validateProjectPermission(AvailableUserRole), getProjectPresence);
router.get("/:projectId/events", verifyRealtimeStream("project"), validateProjectPermission(AvailableUserRole), streamProjectEvents);

export default router;
