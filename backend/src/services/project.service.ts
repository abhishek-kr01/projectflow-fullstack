import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Task } from "../models/task.models.js";
import { Subtask } from "../models/subtask.models.js";
import { ProjectNote } from "../models/projectnote.models.js";
import { Message } from "../models/message.models.js";
import { Notification } from "../models/notification.models.js";
import { safelyNotifyProjectMembers, safelyNotifyUsers } from "./notification.service.js";
import { publishProjectEvent } from "./realtime.service.js";
import { ApiError } from "../utils/api-error.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

export interface ProjectActor {
  id: string;
  username?: string;
  fullName?: string;
}

export async function listProjects(userId: string) {
  const memberships = await ProjectMember.find({ user: userId }).populate("project").lean();
  const projectsOnly = memberships.filter((membership: any) => membership.project);
  const projectIds = projectsOnly.map((membership: any) => membership.project._id);
  const counts = projectIds.length
    ? await ProjectMember.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: "$project", count: { $sum: 1 } } },
      ])
    : [];
  const countByProject = new Map<string, number>(counts.map((row: any) => [String(row._id), Number(row.count)] as [string, number]));
  return projectsOnly.map((membership: any) => {
    const project = membership.project;
    return {
      project: { ...project, members: countByProject.get(String(project._id)) || 0, myRole: membership.role },
      role: membership.role,
    };
  });
}

export async function getProject(projectId: string, myRole: string) {
  const project = await Project.findById(projectId).lean();
  if (!project) throw new ApiError(404, "Project not found.");
  const members = await ProjectMember.countDocuments({ project: project._id });
  return { ...project, members, myRole };
}

export async function createProject(input: { name: string; description?: string; actorId: string }) {
  const project = await Project.create({
    name: input.name.trim(),
    description: String(input.description || "").trim(),
    createdBy: input.actorId,
  });
  try {
    await ProjectMember.create({ user: input.actorId, project: project._id, role: UserRolesEnum.ADMIN });
  } catch (error) {
    await Project.findByIdAndDelete(project._id);
    throw error;
  }
  return { ...project.toObject(), members: 1, myRole: UserRolesEnum.ADMIN };
}

export async function updateProject(input: { projectId: string; actor: ProjectActor; name: string; description?: string }) {
  const project = await Project.findByIdAndUpdate(
    input.projectId,
    { $set: { name: input.name.trim(), description: String(input.description || "").trim() } },
    { new: true, runValidators: true },
  );
  if (!project) throw new ApiError(404, "Project not found.");
  publishProjectEvent(input.projectId, "project:updated", project);
  await safelyNotifyProjectMembers(input.projectId, input.actor.id, {
    type: "project_updated",
    title: "Project details were updated",
    body: `${input.actor.fullName || input.actor.username || "A teammate"} updated “${project.name}”.`,
    href: `/projects/${input.projectId}`,
    entityType: "project",
    entityId: project._id,
  });
  return project;
}

export async function deleteProject(projectId: string) {
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found.");
  const tasks = await Task.find({ project: projectId }).select("_id").lean();
  const taskIds = tasks.map((task: any) => task._id);
  // Keep project deletion consistent across every project-owned entity.
  publishProjectEvent(projectId, "project:deleted", { projectId });
  await Promise.all([
    Subtask.deleteMany({ task: { $in: taskIds } }),
    Message.deleteMany({ project: projectId }),
    Task.deleteMany({ project: projectId }),
    ProjectNote.deleteMany({ project: projectId }),
    ProjectMember.deleteMany({ project: projectId }),
    Notification.deleteMany({ project: projectId }),
  ]);
  await project.deleteOne();
  return { _id: projectId };
}

export async function addProjectMember(input: { projectId: string; actor: ProjectActor; email: string; role: string }) {
  const email = input.email.trim().toLowerCase();
  const user = await User.findOne({ email }).select("_id email username fullName avatar");
  if (!user) throw new ApiError(404, "No account was found for that email. Ask the person to register first.");
  const existing = await ProjectMember.findOne({ project: input.projectId, user: user._id });
  if (existing) throw new ApiError(409, "This person is already a member of the project.");
  const membership = await ProjectMember.create({ user: user._id, project: input.projectId, role: input.role });
  const result = await ProjectMember.findById(membership._id).populate("user", "username email fullName avatar");
  publishProjectEvent(input.projectId, "member:created", result);
  const project = await Project.findById(input.projectId).select("name").lean();
  await safelyNotifyUsers([user._id], {
    actorId: input.actor.id,
    projectId: input.projectId,
    type: "member_added",
    title: "You were added to a project",
    body: `${input.actor.fullName || input.actor.username || "A teammate"} added you to “${project?.name || "a project"}”.`,
    href: `/projects/${input.projectId}`,
    entityType: "member",
    entityId: user._id,
  });
  return result;
}

export async function listProjectMembers(projectId: string) {
  const project = await Project.findById(projectId).select("_id");
  if (!project) throw new ApiError(404, "Project not found.");
  return ProjectMember.find({ project: projectId })
    .populate("user", "username email fullName avatar")
    .sort({ createdAt: 1 })
    .lean();
}

export async function changeProjectMemberRole(input: { projectId: string; userId: string; actor: ProjectActor; newRole: string }) {
  const newRole = String(input.newRole);
  if (!(AvailableUserRole as string[]).includes(newRole)) throw new ApiError(400, "Invalid project role.");
  if (newRole === UserRolesEnum.ADMIN) throw new ApiError(400, "The project owner role cannot be assigned to another member.");
  if (!mongoose.isValidObjectId(input.userId)) throw new ApiError(400, "Invalid user id.");

  const membership = await ProjectMember.findOne({ project: input.projectId, user: input.userId });
  if (!membership) throw new ApiError(404, "Project member not found.");
  const project = await Project.findById(input.projectId).select("createdBy");
  if (project && String(project.createdBy) === input.userId) throw new ApiError(400, "The project owner role cannot be changed.");
  membership.role = newRole;
  await membership.save();
  const updated = await ProjectMember.findById(membership._id).populate("user", "username email fullName avatar");
  publishProjectEvent(input.projectId, "member:updated", updated);
  await safelyNotifyUsers([input.userId], {
    actorId: input.actor.id,
    projectId: input.projectId,
    type: "member_role_updated",
    title: "Your project role changed",
    body: `Your role was changed to ${newRole.replace("_", " ")}.`,
    href: `/projects/${input.projectId}/members`,
    entityType: "member",
    entityId: input.userId,
  });
  return updated;
}

export async function removeProjectMember(input: { projectId: string; userId: string; actorId: string }) {
  if (!mongoose.isValidObjectId(input.userId)) throw new ApiError(400, "Invalid user id.");
  const project = await Project.findById(input.projectId).select("createdBy name");
  if (project && String(project.createdBy) === input.userId) throw new ApiError(400, "The project owner cannot be removed from the project.");
  const membership = await ProjectMember.findOneAndDelete({ project: input.projectId, user: input.userId });
  if (!membership) throw new ApiError(404, "Project member not found.");
  publishProjectEvent(input.projectId, "member:removed", { userId: String(input.userId), membershipId: String(membership._id) });
  await safelyNotifyUsers([input.userId], {
    actorId: input.actorId,
    projectId: input.projectId,
    type: "member_removed",
    title: "You were removed from a project",
    body: `Your access to “${project?.name || "a project"}” was removed.`,
    href: "/notifications",
    entityType: "member",
    entityId: input.userId,
  });
  return membership;
}
