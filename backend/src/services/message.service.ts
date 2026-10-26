import mongoose from "mongoose";
import { Message } from "../models/message.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Task } from "../models/task.models.js";
import { ApiError } from "../utils/api-error.js";
import { publishProjectEvent } from "./realtime.service.js";
import { safelyNotifyProjectMembers, safelyNotifyUsers } from "./notification.service.js";
import { isUserViewingProjectChat } from "./presence.service.js";

export interface MessageActor { id: string; role?: string; username?: string; fullName?: string }

const messagePopulate = [
  { path: "author", select: "username fullName avatar" },
  { path: "mentions", select: "username fullName avatar" },
  { path: "replyTo", select: "_id content author createdAt editedAt", populate: { path: "author", select: "username fullName avatar" } },
];

export async function listProjectMessages(input: { projectId: string; taskId?: string; limit?: number }) {
  const filter: Record<string, unknown> = { project: input.projectId };
  if (input.taskId) {
    if (!mongoose.isValidObjectId(input.taskId)) throw new ApiError(400, "Invalid task id.");
    filter.task = input.taskId;
  } else {
    filter.task = { $exists: false };
  }
  const limit = Math.min(Math.max(Number(input.limit) || 50, 1), 100);
  const messages = await Message.find(filter)
    .populate(messagePopulate)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return messages.reverse();
}

export async function createProjectMessage(input: {
  projectId: string;
  actor: MessageActor;
  content: string;
  taskId?: string;
  replyToId?: string;
  mentionUserIds?: string[];
}) {
  const content = input.content.trim();
  if (!content || content.length > 5000) throw new ApiError(400, "Message must contain 1–5000 characters.");
  let task: string | undefined;
  if (input.taskId) {
    if (!mongoose.isValidObjectId(input.taskId)) throw new ApiError(400, "Invalid task id.");
    const exists = await Task.exists({ _id: input.taskId, project: input.projectId });
    if (!exists) throw new ApiError(404, "Task not found in this project.");
    task = input.taskId;
  }

  let replyTo: string | undefined;
  if (input.replyToId) {
    if (!mongoose.isValidObjectId(input.replyToId)) throw new ApiError(400, "Reply target is invalid.");
    const replyFilter: Record<string, unknown> = { _id: input.replyToId, project: input.projectId };
    if (task) replyFilter.task = task;
    else replyFilter.task = { $exists: false };
    const target = await Message.findOne(replyFilter).select("_id");
    if (!target) throw new ApiError(404, "The message you are replying to was not found in this conversation.");
    replyTo = String(target._id);
  }

  const mentionIds = [...new Set((input.mentionUserIds || []).map((id) => String(id)))];
  if (mentionIds.length > 20) throw new ApiError(400, "You can mention up to 20 project members in one message.");
  if (mentionIds.some((id) => !mongoose.isValidObjectId(id))) throw new ApiError(400, "One or more mentioned users are invalid.");
  if (mentionIds.length) {
    const memberships = await ProjectMember.find({ project: input.projectId, user: { $in: mentionIds } }).select("user").lean();
    const validIds = new Set(memberships.map((member: any) => String(member.user)));
    if (mentionIds.some((id) => !validIds.has(id))) throw new ApiError(400, "You can mention only members of this project.");
  }

  const message = await Message.create({
    project: input.projectId,
    task,
    author: input.actor.id,
    content,
    ...(replyTo ? { replyTo } : {}),
    mentions: mentionIds,
  });
  const populated = await Message.findById(message._id).populate(messagePopulate).lean();
  publishProjectEvent(input.projectId, "message:created", populated);

  const mentionSet = new Set(mentionIds);
  await safelyNotifyProjectMembers(input.projectId, input.actor.id, {
    type: "message_created",
    title: "New project chat message",
    body: `${input.actor.fullName || input.actor.username || "A teammate"}: ${content.slice(0, 140)}`,
    href: `/projects/${input.projectId}/chat`,
    entityType: "message",
    entityId: message._id,
  }, [...mentionSet]);

  const activeMentionRecipients = mentionIds.filter((id) => id !== input.actor.id && !isUserViewingProjectChat(id, input.projectId));
  if (activeMentionRecipients.length) {
    await safelyNotifyUsers(activeMentionRecipients, {
      actorId: input.actor.id,
      projectId: input.projectId,
      type: "message_mentioned",
      title: "You were mentioned in a project chat",
      body: `${input.actor.fullName || input.actor.username || "A teammate"} mentioned you: ${content.slice(0, 120)}`,
      href: `/projects/${input.projectId}/chat`,
      entityType: "message",
      entityId: message._id,
    });
  }
  return populated;
}

export async function updateProjectMessageReceipts(input: { projectId: string; actorId: string; messageIds: unknown[]; status: string }) {
  if (input.status !== "delivered" && input.status !== "read") throw new ApiError(400, "Receipt status must be delivered or read.");
  const messageIds = [...new Set(input.messageIds.map((id) => String(id)))].slice(0, 100);
  if (!messageIds.length || messageIds.some((id) => !mongoose.isValidObjectId(id))) {
    throw new ApiError(400, "Provide one or more valid message ids.");
  }

  const receipts: Array<{ messageId: string; deliveredTo: string[]; readBy: string[] }> = [];
  for (const messageId of messageIds) {
    const message = await Message.findOne({ _id: messageId, project: input.projectId });
    if (!message || String(message.author) === input.actorId) continue;

    const addToSet: Record<string, unknown> = { deliveredTo: input.actorId };
    if (input.status === "read") addToSet.readBy = input.actorId;
    const updated = await Message.findByIdAndUpdate(messageId, { $addToSet: addToSet }, { new: true })
      .select("_id deliveredTo readBy")
      .lean();
    if (!updated) continue;

    const receipt = {
      messageId: String(updated._id),
      userId: input.actorId,
      status: input.status,
      deliveredTo: (updated.deliveredTo || []).map((id: unknown) => String(id)),
      readBy: (updated.readBy || []).map((id: unknown) => String(id)),
    };
    receipts.push({ messageId: receipt.messageId, deliveredTo: receipt.deliveredTo, readBy: receipt.readBy });
    publishProjectEvent(input.projectId, "message:receipt", receipt);
  }
  return receipts;
}

export async function updateProjectMessage(input: { projectId: string; messageId: string; actor: MessageActor; content: string }) {
  const message = await Message.findOne({ _id: input.messageId, project: input.projectId });
  if (!message) throw new ApiError(404, "Message not found.");
  if (String(message.author) !== input.actor.id && input.actor.role !== "admin" && input.actor.role !== "project_admin") {
    throw new ApiError(403, "You can only edit your own messages.");
  }
  const content = input.content.trim();
  if (!content || content.length > 5000) throw new ApiError(400, "Message must contain 1–5000 characters.");
  message.content = content;
  message.editedAt = new Date();
  await message.save();
  const populated = await Message.findById(message._id).populate(messagePopulate).lean();
  publishProjectEvent(input.projectId, "message:updated", populated);
  await safelyNotifyProjectMembers(input.projectId, input.actor.id, {
    type: "message_updated",
    title: "A chat message was edited",
    body: "A project chat message was updated.",
    href: `/projects/${input.projectId}/chat`,
    entityType: "message",
    entityId: message._id,
  });
  return populated;
}

export async function deleteProjectMessage(input: { projectId: string; messageId: string; actor: MessageActor }) {
  const message = await Message.findOne({ _id: input.messageId, project: input.projectId });
  if (!message) throw new ApiError(404, "Message not found.");
  if (String(message.author) !== input.actor.id && input.actor.role !== "admin" && input.actor.role !== "project_admin") {
    throw new ApiError(403, "You can only delete your own messages.");
  }
  await message.deleteOne();
  publishProjectEvent(input.projectId, "message:deleted", { _id: input.messageId });
  await safelyNotifyProjectMembers(input.projectId, input.actor.id, {
    type: "message_deleted",
    title: "A chat message was deleted",
    body: "A project chat message was removed.",
    href: `/projects/${input.projectId}/chat`,
    entityType: "message",
    entityId: input.messageId,
  });
  return { _id: input.messageId };
}
