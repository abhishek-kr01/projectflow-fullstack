import mongoose, { Schema } from "mongoose";

export const NotificationTypes = [
  "task_created",
  "task_updated",
  "task_assigned",
  "task_unassigned",
  "task_deleted",
  "subtask_created",
  "subtask_updated",
  "subtask_deleted",
  "note_created",
  "note_updated",
  "note_deleted",
  "message_created",
  "message_updated",
  "message_deleted",
  "member_added",
  "member_role_updated",
  "member_removed",
  "project_updated",
] as const;

const notificationSchema = new Schema<any>({
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
  project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
  type: { type: String, enum: [...NotificationTypes], required: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  body: { type: String, default: "", trim: true, maxlength: 500 },
  href: { type: String, required: true, trim: true, maxlength: 500 },
  entityType: { type: String, enum: ["project", "task", "note", "message", "member"], required: true },
  entityId: { type: Schema.Types.ObjectId, default: null },
  readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

export const Notification = (mongoose.models.Notification as any) || mongoose.model<any>("Notification", notificationSchema);
