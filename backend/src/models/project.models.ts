import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema<any>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

projectSchema.index({ name: 1, createdBy: 1 }, { unique: true });

export const Project = (mongoose.models.Project as any) || mongoose.model<any>("Project", projectSchema);
