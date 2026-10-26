import mongoose from "mongoose";
import { Notification } from "../models/notification.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { publishUserEvent } from "../utils/realtime.js";
import { asyncHandler } from "../utils/async-handler.js";

export const listNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);
  const [items, unreadCount] = await Promise.all([
    Notification.find({ recipient: req.user._id })
      .populate("actor", "username fullName avatar")
      .populate("project", "name")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipient: req.user._id, readAt: null }),
  ]);
  return res.status(200).json(new ApiResponse(200, { items, unreadCount }, "Notifications fetched successfully."));
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  if (!mongoose.isValidObjectId(notificationId)) throw new ApiError(400, "Invalid notification id.");
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: req.user._id, readAt: null },
    { $set: { readAt: new Date() } },
    { new: true },
  ).populate("actor", "username fullName avatar").populate("project", "name");
  if (!notification) {
    const exists = await Notification.exists({ _id: notificationId, recipient: req.user._id });
    if (!exists) throw new ApiError(404, "Notification not found.");
    return res.status(200).json(new ApiResponse(200, exists, "Notification was already read."));
  }
  publishUserEvent(String(req.user._id), "notification:read", { notificationId, readAt: notification.readAt });
  return res.status(200).json(new ApiResponse(200, notification, "Notification marked as read."));
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, readAt: null },
    { $set: { readAt: new Date() } },
  );
  publishUserEvent(String(req.user._id), "notification:read-all", { modifiedCount: result.modifiedCount });
  return res.status(200).json(new ApiResponse(200, { modifiedCount: result.modifiedCount }, "All notifications marked as read."));
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  if (!mongoose.isValidObjectId(notificationId)) throw new ApiError(400, "Invalid notification id.");
  const deleted = await Notification.findOneAndDelete({ _id: notificationId, recipient: req.user._id });
  if (!deleted) throw new ApiError(404, "Notification not found.");
  publishUserEvent(String(req.user._id), "notification:deleted", { _id: notificationId });
  return res.status(200).json(new ApiResponse(200, { _id: notificationId }, "Notification deleted."));
});

export const markProjectMessageNotificationsRead = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  if (!mongoose.isValidObjectId(projectId)) throw new ApiError(400, "Invalid project id.");
  const result = await Notification.updateMany(
    { recipient: req.user._id, project: projectId, type: { $in: ["message_created", "message_updated", "message_deleted"] }, readAt: null },
    { $set: { readAt: new Date() } },
  );
  publishUserEvent(String(req.user._id), "notification:read-context", { projectId, modifiedCount: result.modifiedCount });
  return res.status(200).json(new ApiResponse(200, { modifiedCount: result.modifiedCount }, "Project chat notifications marked as read."));
});
