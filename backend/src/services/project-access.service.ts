import mongoose from "mongoose";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiError } from "../utils/api-error.js";

export interface ProjectMembershipLookup {
  projectId: string;
  userId: string;
  allowedRoles?: readonly string[];
}

/** Central place for project membership checks used by middleware and services. */
export async function requireProjectMembership({ projectId, userId, allowedRoles }: ProjectMembershipLookup) {
  if (!mongoose.isValidObjectId(projectId)) {
    throw new ApiError(400, "A valid project id is required.");
  }
  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(401, "A valid authenticated user is required.");
  }

  const membership = await ProjectMember.findOne({ project: projectId, user: userId }).lean();
  if (!membership) throw new ApiError(403, "You do not have access to this project.");
  if (allowedRoles && !allowedRoles.includes(String(membership.role))) {
    throw new ApiError(403, "You do not have permission to perform this action.");
  }
  return membership;
}
