import mongoose from "mongoose";
import { Message } from "../models/message.models.js";
import { Task } from "../models/task.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { publishProjectEvent } from "../utils/realtime.js";
import { safelyNotifyProjectMembers } from "../services/notification.service.js";

export const listMessages = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const filter: Record<string, unknown> = { project: projectId };
  if (req.query.taskId) {
    if (!mongoose.isValidObjectId(String(req.query.taskId))) throw new ApiError(400, "Invalid task id.");
    filter.task = String(req.query.taskId);
  } else filter.task = { $exists: false };
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const messages = await Message.find(filter).populate("author", "username fullName avatar").sort({ createdAt: -1 }).limit(limit).lean();
  return res.status(200).json(new ApiResponse(200, messages.reverse(), "Messages fetched."));
});

export const createMessage = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const content = String(req.body.content || "").trim();
  if (!content || content.length > 5000) throw new ApiError(400, "Message must contain 1–5000 characters.");
  let task: string | undefined;
  if (req.body.taskId) {
    if (!mongoose.isValidObjectId(String(req.body.taskId))) throw new ApiError(400, "Invalid task id.");
    const exists = await Task.exists({ _id: req.body.taskId, project: projectId });
    if (!exists) throw new ApiError(404, "Task not found in this project.");
    task = String(req.body.taskId);
  }
  const message = await Message.create({ project: projectId, task, author: req.user._id, content });
  const populated = await Message.findById(message._id).populate("author", "username fullName avatar").lean();
  publishProjectEvent(projectId, "message:created", populated);
  await safelyNotifyProjectMembers(projectId, req.user._id, {
    type: "message_created", title: "New project chat message",
    body: `${req.user.fullName || req.user.username || "A teammate"}: ${content.slice(0, 140)}`,
    href: `/projects/${projectId}/chat`, entityType: "message", entityId: message._id,
  });
  return res.status(201).json(new ApiResponse(201, populated, "Message sent."));
});

export const updateMessage = asyncHandler(async (req, res) => {
  const message = await Message.findOne({ _id: req.params.messageId, project: req.params.projectId });
  if (!message) throw new ApiError(404, "Message not found.");
  if (String(message.author) !== String(req.user._id) && req.user.role !== "admin" && req.user.role !== "project_admin") throw new ApiError(403, "You can only edit your own messages.");
  const content = String(req.body.content || "").trim();
  if (!content || content.length > 5000) throw new ApiError(400, "Message must contain 1–5000 characters.");
  message.content = content; message.editedAt = new Date(); await message.save();
  const populated = await Message.findById(message._id).populate("author", "username fullName avatar").lean();
  publishProjectEvent(req.params.projectId, "message:updated", populated);
  await safelyNotifyProjectMembers(req.params.projectId, req.user._id, {
    type: "message_updated", title: "A chat message was edited", body: "A project chat message was updated.",
    href: `/projects/${req.params.projectId}/chat`, entityType: "message", entityId: message._id,
  });
  return res.status(200).json(new ApiResponse(200, populated, "Message updated."));
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findOne({ _id: req.params.messageId, project: req.params.projectId });
  if (!message) throw new ApiError(404, "Message not found.");
  if (String(message.author) !== String(req.user._id) && req.user.role !== "admin" && req.user.role !== "project_admin") throw new ApiError(403, "You can only delete your own messages.");
  await message.deleteOne();
  publishProjectEvent(req.params.projectId, "message:deleted", { _id: req.params.messageId });
  await safelyNotifyProjectMembers(req.params.projectId, req.user._id, {
    type: "message_deleted", title: "A chat message was deleted", body: "A project chat message was removed.",
    href: `/projects/${req.params.projectId}/chat`, entityType: "message", entityId: req.params.messageId,
  });
  return res.status(200).json(new ApiResponse(200, { _id: req.params.messageId }, "Message deleted."));
});
