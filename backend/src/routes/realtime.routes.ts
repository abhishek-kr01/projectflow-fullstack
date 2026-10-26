import { Router } from "express";
import {
  getProjectPresence,
  streamProjectEvents,
  streamUserNotifications,
  updatePresence,
} from "../controllers/realtime.controllers.js";
import { verifyJWT, validateProjectPermission } from "../middlewares/auth.middleware.js";
import { AvailableUserRole } from "../utils/constants.js";

const router = Router();

router.get("/users/notifications/events", verifyJWT, streamUserNotifications);
router.post("/presence", verifyJWT, updatePresence);
router.get("/:projectId/presence", verifyJWT, validateProjectPermission(AvailableUserRole), getProjectPresence);
router.get("/:projectId/events", verifyJWT, validateProjectPermission(AvailableUserRole), streamProjectEvents);

export default router;
