import mongoose, { Schema } from "mongoose";
import { AvailableTaskStatuses, TaskStatusEnum } from "../utils/constants.js";

const taskSchema = new Schema<any>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: undefined },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", default: undefined },
    status: { type: String, enum: AvailableTaskStatuses, default: TaskStatusEnum.TODO },
    attachments: { type: [{ url: String, mimetype: String, size: Number }], default: [] },
  },
  { timestamps: true },
);

export const Task = (mongoose.models.Task as any) || mongoose.model<any>("Task", taskSchema);
