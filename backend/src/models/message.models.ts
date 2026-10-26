import mongoose, { Schema } from "mongoose";
const messageSchema = new Schema<any>({
  project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  task: { type: Schema.Types.ObjectId, ref: "Task", default: undefined, index: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
  replyTo: { type: Schema.Types.ObjectId, ref: "Message", default: undefined, index: true },
  mentions: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
  editedAt: { type: Date, default: undefined },
  deliveredTo: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
  readBy: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
}, { timestamps: true });
messageSchema.index({ project: 1, createdAt: -1 });
export const Message = (mongoose.models.Message as any) || mongoose.model<any>("Message", messageSchema);
