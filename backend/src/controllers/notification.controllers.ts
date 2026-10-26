import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  listUserNotifications,
  markAllUserNotificationsRead,
  markProjectMessageNotificationsRead as markProjectMessageNotificationsReadService,
  markUserNotificationRead,
  removeUserNotification,
} from "../services/notification.service.js";

export const listNotifications = asyncHandler(async (req, res) => {
  const result = await listUserNotifications(String(req.user._id), Number(req.query.limit));
  res.status(200).json(new ApiResponse(200, result, "Notifications fetched successfully."));
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const result = await markUserNotificationRead(String(req.user._id), String(req.params.notificationId));
  res.status(200).json(new ApiResponse(200, result.notification, result.alreadyRead ? "Notification was already read." : "Notification marked as read."));
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await markAllUserNotificationsRead(String(req.user._id));
  res.status(200).json(new ApiResponse(200, result, "All notifications marked as read."));
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const result = await removeUserNotification(String(req.user._id), String(req.params.notificationId));
  res.status(200).json(new ApiResponse(200, result, "Notification deleted."));
});

export const markProjectMessageNotificationsRead = asyncHandler(async (req, res) => {
  const result = await markProjectMessageNotificationsReadService(String(req.user._id), String(req.params.projectId));
  res.status(200).json(new ApiResponse(200, result, "Project chat notifications marked as read."));
});
