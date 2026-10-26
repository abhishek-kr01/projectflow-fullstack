import mongoose from "mongoose";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Task } from "../models/task.models.js";
import { Subtask } from "../models/subtask.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AvailableTaskStatuses, UserRolesEnum } from "../utils/constants.js";
import { publishProjectEvent } from "../utils/realtime.js";

const assertAssigneeIsMember = async (projectId: string, assignedTo?: string | null) => {
  if (!assignedTo) return;
  if (!mongoose.isValidObjectId(assignedTo)) throw new ApiError(400, "Assignee id is invalid.");
  const isMember = await ProjectMember.exists({ project: projectId, user: assignedTo });
  if (!isMember) throw new ApiError(400, "The assignee must be a member of this project.");
};

export const getTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId).select("_id");
  if (!project) throw new ApiError(404, "Project not found.");
  const tasks = await Task.find({ project: projectId })
    .populate("assignedTo", "avatar username fullName email")
    .populate("assignedBy", "avatar username fullName")
    .sort({ updatedAt: -1 });
  return res.status(200).json(new ApiResponse(200, tasks, "Tasks fetched successfully."));
});

export const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, description, assignedTo, status } = req.body;
  const project = await Project.findById(projectId).select("_id");
  if (!project) throw new ApiError(404, "Project not found.");
  await assertAssigneeIsMember(projectId, assignedTo);

  const files = (req.files || []) as Express.Multer.File[];
  const serverUrl = (process.env.SERVER_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  const attachments = files.map((file) => ({ url: `${serverUrl}/images/${encodeURIComponent(file.filename)}`, mimetype: file.mimetype, size: file.size }));
  const task = await Task.create({
    title: String(title).trim(),
    description: String(description || "").trim(),
    project: projectId,
    assignedTo: assignedTo || undefined,
    assignedBy: req.user._id,
    status: status || "todo",
    attachments,
  });
  const populated = await Task.findById(task._id).populate("assignedTo", "avatar username fullName email").populate("assignedBy", "avatar username fullName");
  publishProjectEvent(projectId, "task:created", populated);
  return res.status(201).json(new ApiResponse(201, populated, "Task created successfully."));
});

export const getTaskById = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const task = await Task.findOne({ _id: taskId, project: projectId })
    .populate("assignedTo", "avatar username fullName email")
    .populate("assignedBy", "avatar username fullName");
  if (!task) throw new ApiError(404, "Task not found in this project.");
  const subtasks = await Subtask.find({ task: taskId }).populate("createdBy", "username fullName avatar").sort({ createdAt: 1 });
  return res.status(200).json(new ApiResponse(200, { ...task.toObject(), subtasks }, "Task fetched successfully."));
});

export const updateTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw new ApiError(404, "Task not found in this project.");
  const { title, description, status, assignedTo } = req.body;

  // Members may only change the status of a task assigned to themselves.
  // Admins and project admins can continue editing task details and assignees.
  if (req.user?.role === UserRolesEnum.MEMBER) {
    const submittedFields = Object.keys(req.body ?? {});
    if (submittedFields.length !== 1 || submittedFields[0] !== "status" || status === undefined) {
      throw new ApiError(403, "Members can only update the status of their assigned tasks.");
    }
    if (!task.assignedTo || String(task.assignedTo) !== String(req.user._id)) {
      throw new ApiError(403, "You can only update the status of tasks assigned to you.");
    }
    if (!(AvailableTaskStatuses as string[]).includes(String(status))) {
      throw new ApiError(400, "Status must be todo, in_progress, or done.");
    }
  }

  if (title !== undefined) task.title = String(title).trim();
  if (description !== undefined) task.description = String(description).trim();
  if (status !== undefined) task.status = status === "in-progress" ? "in_progress" : status;
  if (Object.prototype.hasOwnProperty.call(req.body, "assignedTo")) {
    await assertAssigneeIsMember(projectId, assignedTo || null);
    task.assignedTo = assignedTo || undefined;
  }
  await task.save();
  const populated = await Task.findById(task._id).populate("assignedTo", "avatar username fullName email").populate("assignedBy", "avatar username fullName");
  publishProjectEvent(projectId, "task:updated", populated);
  return res.status(200).json(new ApiResponse(200, populated, "Task updated successfully."));
});

export const deleteTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const task = await Task.findOneAndDelete({ _id: taskId, project: projectId });
  if (!task) throw new ApiError(404, "Task not found in this project.");
  await Subtask.deleteMany({ task: taskId });
  publishProjectEvent(projectId, "task:deleted", { _id: taskId });
  return res.status(200).json(new ApiResponse(200, task, "Task and its subtasks deleted successfully."));
});

export const createSubTask = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const task = await Task.findOne({ _id: taskId, project: projectId }).select("_id");
  if (!task) throw new ApiError(404, "Task not found in this project.");
  const subtask = await Subtask.create({ title: String(req.body.title).trim(), task: taskId, createdBy: req.user._id });
  const populated = await Subtask.findById(subtask._id).populate("createdBy", "username fullName avatar");
  return res.status(201).json(new ApiResponse(201, populated, "Subtask created successfully."));
});

const findSubtaskInProject = async (projectId: string, subTaskId: string) => {
  const subtask = await Subtask.findById(subTaskId);
  if (!subtask) throw new ApiError(404, "Subtask not found.");
  const task = await Task.findOne({ _id: subtask.task, project: projectId }).select("_id");
  if (!task) throw new ApiError(404, "Subtask not found in this project.");
  return subtask;
};

export const updateSubTask = asyncHandler(async (req, res) => {
  const subtask = await findSubtaskInProject(req.params.projectId, req.params.subTaskId);
  if (req.body.title !== undefined) subtask.title = String(req.body.title).trim();
  if (req.body.isCompleted !== undefined) subtask.isCompleted = req.body.isCompleted === true || req.body.isCompleted === "true";
  await subtask.save();
  const populated = await Subtask.findById(subtask._id).populate("createdBy", "username fullName avatar");
  return res.status(200).json(new ApiResponse(200, populated, "Subtask updated successfully."));
});

export const deleteSubTask = asyncHandler(async (req, res) => {
  const subtask = await findSubtaskInProject(req.params.projectId, req.params.subTaskId);
  await subtask.deleteOne();
  return res.status(200).json(new ApiResponse(200, subtask, "Subtask deleted successfully."));
});
