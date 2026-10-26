import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { deleteNotification, listNotifications, markAllNotificationsRead, markNotificationRead } from "../controllers/notification.controllers.js";

const router = Router();
router.use(verifyJWT);
router.get("/", listNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:notificationId/read", markNotificationRead);
router.delete("/:notificationId", deleteNotification);
export default router;
