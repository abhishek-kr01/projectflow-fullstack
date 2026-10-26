import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Task } from "../models/task.models.js";
import { Subtask } from "../models/subtask.models.js";
import { ProjectNote } from "../models/projectnote.models.js";
import { Notification } from "../models/notification.models.js";
import { safelyNotifyProjectMembers, safelyNotifyUsers } from "../services/notification.service.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

export const getProjects = asyncHandler(async (req, res) => {
  const memberships = await ProjectMember.find({ user: req.user._id }).populate("project").lean();
  const projects = await Promise.all(memberships.filter((member: any) => member.project).map(async (membership: any) => {
    const project = membership.project;
    const members = await ProjectMember.countDocuments({ project: project._id });
    return { project: { ...project, members, myRole: membership.role }, role: membership.role };
  }));
  return res.status(200).json(new ApiResponse(200, projects, "Projects fetched successfully."));
});

export const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId).lean();
  if (!project) throw new ApiError(404, "Project not found.");
  const members = await ProjectMember.countDocuments({ project: project._id });
  return res.status(200).json(new ApiResponse(200, { ...project, members, myRole: req.user.role }, "Project fetched successfully."));
});

export const createProject = asyncHandler(async (req, res) => {
  const name = String(req.body.name).trim();
  const description = String(req.body.description || "").trim();
  const project = await Project.create({ name, description, createdBy: req.user._id });
  try {
    await ProjectMember.create({ user: req.user._id, project: project._id, role: UserRolesEnum.ADMIN });
  } catch (error) {
    await Project.findByIdAndDelete(project._id);
    throw error;
  }
  return res.status(201).json(new ApiResponse(201, { ...project.toObject(), members: 1, myRole: UserRolesEnum.ADMIN }, "Project created successfully."));
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findByIdAndUpdate(
    req.params.projectId,
    { $set: { name: String(req.body.name).trim(), description: String(req.body.description || "").trim() } },
    { new: true, runValidators: true },
  );
  if (!project) throw new ApiError(404, "Project not found.");
  await safelyNotifyProjectMembers(req.params.projectId, req.user._id, {
    type: "project_updated", title: "Project details were updated",
    body: `${req.user.fullName || req.user.username || "A teammate"} updated “${project.name}”.`,
    href: `/projects/${req.params.projectId}`, entityType: "project", entityId: project._id,
  });
  return res.status(200).json(new ApiResponse(200, project, "Project updated successfully."));
});

export const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found.");
  const tasks = await Task.find({ project: projectId }).select("_id").lean();
  const taskIds = tasks.map((task: any) => task._id);
  await Promise.all([
    Subtask.deleteMany({ task: { $in: taskIds } }),
    Task.deleteMany({ project: projectId }),
    ProjectNote.deleteMany({ project: projectId }),
    ProjectMember.deleteMany({ project: projectId }),
    Notification.deleteMany({ project: projectId }),
  ]);
  await project.deleteOne();
  return res.status(200).json(new ApiResponse(200, { _id: projectId }, "Project and its related data deleted successfully."));
});

export const addMembersToProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const email = String(req.body.email).trim().toLowerCase();
  const role = String(req.body.role);
  const user = await User.findOne({ email }).select("_id email username fullName avatar");
  if (!user) throw new ApiError(404, "No account was found for that email. Ask the person to register first.");
  const existing = await ProjectMember.findOne({ project: projectId, user: user._id });
  if (existing) throw new ApiError(409, "This person is already a member of the project.");
  const membership = await ProjectMember.create({ user: user._id, project: projectId, role });
  const result = await ProjectMember.findById(membership._id).populate("user", "username email fullName avatar");
  const project = await Project.findById(projectId).select("name").lean();
  await safelyNotifyUsers([user._id], {
    actorId: req.user._id, projectId, type: "member_added", title: "You were added to a project",
    body: `${req.user.fullName || req.user.username || "A teammate"} added you to “${project?.name || "a project"}”.`,
    href: `/projects/${projectId}`, entityType: "member", entityId: user._id,
  });
  return res.status(201).json(new ApiResponse(201, result, "Project member added successfully."));
});

export const getProjectMembers = asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const project = await Project.findById(projectId).select("_id");
  if (!project) throw new ApiError(404, "Project not found.");
  const members = await ProjectMember.find({ project: projectId })
    .populate("user", "username email fullName avatar")
    .sort({ createdAt: 1 })
    .lean();
  return res.status(200).json(new ApiResponse(200, members, "Project members fetched successfully."));
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const newRole = String(req.body.newRole);
  if (!(AvailableUserRole as string[]).includes(newRole)) throw new ApiError(400, "Invalid project role.");
  if (newRole === UserRolesEnum.ADMIN) throw new ApiError(400, "The project owner role cannot be assigned to another member.");

  const membership = await ProjectMember.findOne({ project: projectId, user: userId });
  if (!membership) throw new ApiError(404, "Project member not found.");
  const project = await Project.findById(projectId).select("createdBy");
  if (project && String(project.createdBy) === String(userId)) throw new ApiError(400, "The project owner role cannot be changed.");
  membership.role = newRole;
  await membership.save();
  const updated = await ProjectMember.findById(membership._id).populate("user", "username email fullName avatar");
  await safelyNotifyUsers([userId], {
    actorId: req.user._id, projectId, type: "member_role_updated", title: "Your project role changed",
    body: `Your role was changed to ${newRole.replace("_", " ")}.`,
    href: `/projects/${projectId}/members`, entityType: "member", entityId: userId,
  });
  return res.status(200).json(new ApiResponse(200, updated, "Project member role updated successfully."));
});

export const deleteMember = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const project = await Project.findById(projectId).select("createdBy name");
  if (project && String(project.createdBy) === String(userId)) throw new ApiError(400, "The project owner cannot be removed from the project.");
  const membership = await ProjectMember.findOneAndDelete({ project: projectId, user: userId });
  if (!membership) throw new ApiError(404, "Project member not found.");
  await safelyNotifyUsers([userId], {
    actorId: req.user._id, projectId, type: "member_removed", title: "You were removed from a project",
    body: `Your access to “${project?.name || "a project"}” was removed.`,
    href: "/notifications", entityType: "member", entityId: userId,
  });
  return res.status(200).json(new ApiResponse(200, membership, "Project member removed successfully."));
});
