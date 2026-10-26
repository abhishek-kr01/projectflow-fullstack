import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createProjectMessage,
  deleteProjectMessage,
  listProjectMessages,
  updateProjectMessage,
  updateProjectMessageReceipts,
  type MessageActor,
} from "../services/message.service.js";

const actorFromRequest = (req: any): MessageActor => ({
  id: String(req.user._id),
  role: req.projectRole,
  username: req.user.username,
  fullName: req.user.fullName,
});

export const listMessages = asyncHandler(async (req, res) => {
  const messages = await listProjectMessages({
    projectId: String(req.params.projectId),
    taskId: req.query.taskId ? String(req.query.taskId) : undefined,
    limit: Number(req.query.limit),
  });
  res.status(200).json(new ApiResponse(200, messages, "Messages fetched."));
});

export const createMessage = asyncHandler(async (req, res) => {
  const message = await createProjectMessage({
    projectId: String(req.params.projectId),
    actor: actorFromRequest(req),
    content: String(req.body.content || ""),
    taskId: req.body.taskId ? String(req.body.taskId) : undefined,
    replyToId: req.body.replyToId ? String(req.body.replyToId) : undefined,
    mentionUserIds: Array.isArray(req.body.mentionUserIds) ? req.body.mentionUserIds.map(String) : [],
  });
  res.status(201).json(new ApiResponse(201, message, "Message sent."));
});

export const updateMessageReceipts = asyncHandler(async (req, res) => {
  const receipts = await updateProjectMessageReceipts({
    projectId: String(req.params.projectId),
    actorId: String(req.user._id),
    messageIds: Array.isArray(req.body.messageIds) ? req.body.messageIds : [],
    status: String(req.body.status || ""),
  });
  res.status(200).json(new ApiResponse(200, receipts, "Message receipts updated."));
});

export const updateMessage = asyncHandler(async (req, res) => {
  const message = await updateProjectMessage({
    projectId: String(req.params.projectId),
    messageId: String(req.params.messageId),
    actor: actorFromRequest(req),
    content: String(req.body.content || ""),
  });
  res.status(200).json(new ApiResponse(200, message, "Message updated."));
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const result = await deleteProjectMessage({
    projectId: String(req.params.projectId),
    messageId: String(req.params.messageId),
    actor: actorFromRequest(req),
  });
  res.status(200).json(new ApiResponse(200, result, "Message deleted."));
});
