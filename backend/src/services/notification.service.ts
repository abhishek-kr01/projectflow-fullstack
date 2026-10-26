import mongoose from "mongoose";
import { Notification } from "../models/notification.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { isUserViewingProjectChat } from "./presence.service.js";
import { publishUserEvent } from "./realtime.service.js";
import { ApiError } from "../utils/api-error.js";

type NotificationType =
  | "task_created" | "task_updated" | "task_assigned" | "task_unassigned" | "task_deleted"
  | "subtask_created" | "subtask_updated" | "subtask_deleted"
  | "note_created" | "note_updated" | "note_deleted"
  | "message_created" | "message_updated" | "message_deleted"
  | "member_added" | "member_role_updated" | "member_removed" | "project_updated";
type EntityType = "project" | "task" | "note" | "message" | "member";

export interface CreateNotificationInput {
  recipientId: string | mongoose.Types.ObjectId;
  actorId?: string | mongoose.Types.ObjectId | null;
  projectId?: string | mongoose.Types.ObjectId | null;
  type: NotificationType;
  title: string;
  body?: string;
  href: string;
  entityType: EntityType;
  entityId?: string | mongoose.Types.ObjectId | null;
}

export async function createNotification(input: CreateNotificationInput) {
  const recipientId = String(input.recipientId);
  if (input.actorId && recipientId === String(input.actorId)) return null;
  if (!mongoose.isValidObjectId(recipientId)) return null;

  const created = await Notification.create({
    recipient: recipientId,
    actor: input.actorId || null,
    project: input.projectId || null,
    type: input.type,
    title: input.title,
    body: input.body || "",
    href: input.href,
    entityType: input.entityType,
    entityId: input.entityId || null,
    readAt: null,
  });
  const populated = await Notification.findById(created._id)
    .populate("actor", "username fullName avatar")
    .populate("project", "name")
    .lean();
  if (populated) publishUserEvent(recipientId, "notification:created", populated);
  return populated;
}

export async function notifyUsers(recipientIds: Array<string | mongoose.Types.ObjectId>, input: Omit<CreateNotificationInput, "recipientId">) {
  const unique = [...new Set(recipientIds.map(String))].filter(
    (id) => mongoose.isValidObjectId(id) && (!input.actorId || id !== String(input.actorId)),
  );
  if (!unique.length) return [];
  const results = await Promise.all(unique.map((recipientId) => createNotification({ ...input, recipientId })));
  return results.filter(Boolean);
}

export async function notifyProjectMembers(
  projectId: string | mongoose.Types.ObjectId,
  actorId: string | mongoose.Types.ObjectId,
  input: Omit<CreateNotificationInput, "recipientId" | "actorId" | "projectId">,
  excludeUserIds: Array<string | mongoose.Types.ObjectId> = [],
) {
  const members = await ProjectMember.find({ project: projectId }).select("user").lean();
  const excluded = new Set(excludeUserIds.map(String));
  const recipientIds = members.map((member: any) => member.user).filter((id: any) => {
    if (excluded.has(String(id))) return false;
    if (input.type.startsWith("message_") && isUserViewingProjectChat(String(id), String(projectId))) return false;
    return true;
  });
  return notifyUsers(recipientIds, { ...input, actorId, projectId });
}

export async function safelyNotifyProjectMembers(
  projectId: string | mongoose.Types.ObjectId,
  actorId: string | mongoose.Types.ObjectId,
  input: Omit<CreateNotificationInput, "recipientId" | "actorId" | "projectId">,
  excludeUserIds: Array<string | mongoose.Types.ObjectId> = [],
) {
  try { return await notifyProjectMembers(projectId, actorId, input, excludeUserIds); }
  catch (error) { console.error("Notification delivery failed:", error); return []; }
}

export async function safelyNotifyUsers(
  recipientIds: Array<string | mongoose.Types.ObjectId>,
  input: Omit<CreateNotificationInput, "recipientId">,
) {
  try { return await notifyUsers(recipientIds, input); }
  catch (error) { console.error("Notification delivery failed:", error); return []; }
}

export async function listUserNotifications(userId: string, limitInput?: number) {
  const limit = Math.min(Math.max(Number(limitInput) || 30, 1), 50);
  const [items, unreadCount] = await Promise.all([
    Notification.find({ recipient: userId })
      .populate("actor", "username fullName avatar")
      .populate("project", "name")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipient: userId, readAt: null }),
  ]);
  return { items, unreadCount };
}

export async function markUserNotificationRead(userId: string, notificationId: string) {
  if (!mongoose.isValidObjectId(notificationId)) throw new ApiError(400, "Invalid notification id.");
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId, readAt: null },
    { $set: { readAt: new Date() } },
    { new: true },
  ).populate("actor", "username fullName avatar").populate("project", "name");

  if (!notification) {
    const exists = await Notification.exists({ _id: notificationId, recipient: userId });
    if (!exists) throw new ApiError(404, "Notification not found.");
    return { notification: exists, alreadyRead: true };
  }
  publishUserEvent(userId, "notification:read", { notificationId, readAt: notification.readAt });
  return { notification, alreadyRead: false };
}

export async function markAllUserNotificationsRead(userId: string) {
  const result = await Notification.updateMany({ recipient: userId, readAt: null }, { $set: { readAt: new Date() } });
  publishUserEvent(userId, "notification:read-all", { modifiedCount: result.modifiedCount });
  return { modifiedCount: result.modifiedCount };
}

export async function removeUserNotification(userId: string, notificationId: string) {
  if (!mongoose.isValidObjectId(notificationId)) throw new ApiError(400, "Invalid notification id.");
  const deleted = await Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
  if (!deleted) throw new ApiError(404, "Notification not found.");
  publishUserEvent(userId, "notification:deleted", { _id: notificationId });
  return { _id: notificationId };
}

export async function markProjectMessageNotificationsRead(userId: string, projectId: string) {
  if (!mongoose.isValidObjectId(projectId)) throw new ApiError(400, "Invalid project id.");
  const result = await Notification.updateMany(
    { recipient: userId, project: projectId, type: { $in: ["message_created", "message_updated", "message_deleted"] }, readAt: null },
    { $set: { readAt: new Date() } },
  );
  publishUserEvent(userId, "notification:read-context", { projectId, modifiedCount: result.modifiedCount });
  return { modifiedCount: result.modifiedCount };
}
