import mongoose from "mongoose";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Task } from "../models/task.models.js";
import { Subtask } from "../models/subtask.models.js";
import { Message } from "../models/message.models.js";
import { ApiError } from "../utils/api-error.js";
import { publishProjectEvent } from "./realtime.service.js";
import { safelyNotifyProjectMembers, safelyNotifyUsers } from "./notification.service.js";
import { assertTaskUpdateAllowed } from "./task-policy.service.js";

export interface TaskActor {
  id: string;
  role?: string;
  username?: string;
  fullName?: string;
}
export interface TaskAttachmentInput { url: string; mimetype: string; size: number }
export interface CreateTaskInput {
  projectId: string;
  actor: TaskActor;
  title: string;
  description?: string;
  assignedTo?: string | null;
  status?: string;
  attachments?: TaskAttachmentInput[];
}
export interface UpdateTaskInput {
  projectId: string;
  taskId: string;
  actor: TaskActor;
  body: Record<string, unknown>;
}

async function assertAssigneeIsMember(projectId: string, assignedTo?: string | null): Promise<void> {
  if (!assignedTo) return;
  if (!mongoose.isValidObjectId(assignedTo)) throw new ApiError(400, "Assignee id is invalid.");
  const isMember = await ProjectMember.exists({ project: projectId, user: assignedTo });
  if (!isMember) throw new ApiError(400, "The assignee must be a member of this project.");
}

export async function listTasks(projectId: string) {
  const project = await Project.findById(projectId).select("_id");
  if (!project) throw new ApiError(404, "Project not found.");
  return Task.find({ project: projectId })
    .populate("assignedTo", "avatar username fullName email")
    .populate("assignedBy", "avatar username fullName")
    .sort({ updatedAt: -1 });
}

export async function createTask(input: CreateTaskInput) {
  const project = await Project.findById(input.projectId).select("_id");
  if (!project) throw new ApiError(404, "Project not found.");
  await assertAssigneeIsMember(input.projectId, input.assignedTo);

  const task = await Task.create({
    title: input.title.trim(),
    description: String(input.description || "").trim(),
    project: input.projectId,
    assignedTo: input.assignedTo || undefined,
    assignedBy: input.actor.id,
    status: input.status || "todo",
    attachments: input.attachments || [],
  });
  const populated = await Task.findById(task._id)
    .populate("assignedTo", "avatar username fullName email")
    .populate("assignedBy", "avatar username fullName");
  publishProjectEvent(input.projectId, "task:created", populated);

  const assignedId = task.assignedTo ? String(task.assignedTo) : "";
  await safelyNotifyProjectMembers(input.projectId, input.actor.id, {
    type: "task_created",
    title: "A task was created",
    body: `${input.actor.fullName || input.actor.username || "A teammate"} created “${task.title}”.`,
    href: `/projects/${input.projectId}/tasks`,
    entityType: "task",
    entityId: task._id,
  }, assignedId ? [assignedId] : []);
  if (assignedId && assignedId !== input.actor.id) {
    await safelyNotifyUsers([assignedId], {
      actorId: input.actor.id,
      projectId: input.projectId,
      type: "task_assigned",
      title: "A task was assigned to you",
      body: `You were assigned “${task.title}”.`,
      href: `/projects/${input.projectId}/tasks`,
      entityType: "task",
      entityId: task._id,
    });
  }
  return populated;
}

export async function getTask(projectId: string, taskId: string) {
  const task = await Task.findOne({ _id: taskId, project: projectId })
    .populate("assignedTo", "avatar username fullName email")
    .populate("assignedBy", "avatar username fullName");
  if (!task) throw new ApiError(404, "Task not found in this project.");
  const subtasks = await Subtask.find({ task: taskId }).populate("createdBy", "username fullName avatar").sort({ createdAt: 1 });
  return { ...task.toObject(), subtasks };
}

export async function updateTask(input: UpdateTaskInput) {
  const { projectId, taskId, actor, body } = input;
  const task = await Task.findOne({ _id: taskId, project: projectId });
  if (!task) throw new ApiError(404, "Task not found in this project.");
  const { title, description, status, assignedTo } = body;
  const previousAssigneeId = task.assignedTo ? String(task.assignedTo) : "";
  const previousStatus = String(task.status);
  const assignmentWasSubmitted = Object.prototype.hasOwnProperty.call(body, "assignedTo");

  assertTaskUpdateAllowed(actor.role, body);

  if (title !== undefined) task.title = String(title).trim();
  if (description !== undefined) task.description = String(description).trim();
  if (status !== undefined) task.status = status === "in-progress" ? "in_progress" : String(status);
  if (assignmentWasSubmitted) {
    const nextAssignee = assignedTo ? String(assignedTo) : null;
    await assertAssigneeIsMember(projectId, nextAssignee);
    task.assignedTo = nextAssignee || undefined;
  }
  await task.save();
  const populated = await Task.findById(task._id)
    .populate("assignedTo", "avatar username fullName email")
    .populate("assignedBy", "avatar username fullName");
  publishProjectEvent(projectId, "task:updated", populated);

  const currentAssigneeId = task.assignedTo ? String(task.assignedTo) : "";
  const assignmentChanged = assignmentWasSubmitted && previousAssigneeId !== currentAssigneeId;
  await safelyNotifyProjectMembers(projectId, actor.id, {
    type: assignmentChanged ? (currentAssigneeId ? "task_assigned" : "task_unassigned") : "task_updated",
    title: assignmentChanged ? "Task assignment changed" : "Task updated",
    body: assignmentChanged
      ? `Assignment changed for “${task.title}”.`
      : `${actor.fullName || actor.username || "A teammate"} updated “${task.title}”${previousStatus !== String(task.status) ? ` to ${String(task.status).replace("_", " ")}` : ""}.`,
    href: `/projects/${projectId}/tasks`,
    entityType: "task",
    entityId: task._id,
  }, assignmentChanged && currentAssigneeId ? [currentAssigneeId] : []);
  if (assignmentChanged && currentAssigneeId && currentAssigneeId !== actor.id) {
    await safelyNotifyUsers([currentAssigneeId], {
      actorId: actor.id,
      projectId,
      type: "task_assigned",
      title: "A task was assigned to you",
      body: `You were assigned “${task.title}”.`,
      href: `/projects/${projectId}/tasks`,
      entityType: "task",
      entityId: task._id,
    });
  }
  return populated;
}

export async function deleteTask(projectId: string, taskId: string, actorId: string) {
  const task = await Task.findOneAndDelete({ _id: taskId, project: projectId });
  if (!task) throw new ApiError(404, "Task not found in this project.");
  await Promise.all([
    Subtask.deleteMany({ task: taskId }),
    Message.deleteMany({ project: projectId, task: taskId }),
  ]);
  publishProjectEvent(projectId, "task:deleted", { _id: taskId });
  await safelyNotifyProjectMembers(projectId, actorId, {
    type: "task_deleted",
    title: "A task was deleted",
    body: `“${task.title}” was deleted.`,
    href: `/projects/${projectId}/tasks`,
    entityType: "task",
    entityId: task._id,
  });
  return task;
}

export async function createSubTask(input: { projectId: string; taskId: string; actorId: string; title: string }) {
  const task = await Task.findOne({ _id: input.taskId, project: input.projectId }).select("_id title");
  if (!task) throw new ApiError(404, "Task not found in this project.");
  const subtask = await Subtask.create({ title: input.title.trim(), task: input.taskId, createdBy: input.actorId });
  const populated = await Subtask.findById(subtask._id).populate("createdBy", "username fullName avatar");
  publishProjectEvent(input.projectId, "subtask:created", populated);
  await safelyNotifyProjectMembers(input.projectId, input.actorId, {
    type: "subtask_created",
    title: "A subtask was added",
    body: `A subtask was added to “${task.title}”.`,
    href: `/projects/${input.projectId}/tasks`,
    entityType: "task",
    entityId: input.taskId,
  });
  return populated;
}

async function findSubtaskInProject(projectId: string, subTaskId: string) {
  const subtask = await Subtask.findById(subTaskId);
  if (!subtask) throw new ApiError(404, "Subtask not found.");
  const task = await Task.findOne({ _id: subtask.task, project: projectId }).select("_id");
  if (!task) throw new ApiError(404, "Subtask not found in this project.");
  return subtask;
}

export async function updateSubTask(input: { projectId: string; subTaskId: string; actorId: string; body: { title?: unknown; isCompleted?: unknown } }) {
  const subtask = await findSubtaskInProject(input.projectId, input.subTaskId);
  if (input.body.title !== undefined) subtask.title = String(input.body.title).trim();
  if (input.body.isCompleted !== undefined) subtask.isCompleted = input.body.isCompleted === true || input.body.isCompleted === "true";
  await subtask.save();
  const populated = await Subtask.findById(subtask._id).populate("createdBy", "username fullName avatar");
  publishProjectEvent(input.projectId, "subtask:updated", populated);
  await safelyNotifyProjectMembers(input.projectId, input.actorId, {
    type: "subtask_updated",
    title: "A subtask was updated",
    body: `Subtask “${subtask.title}” was updated.`,
    href: `/projects/${input.projectId}/tasks`,
    entityType: "task",
    entityId: subtask.task,
  });
  return populated;
}

export async function deleteSubTask(projectId: string, subTaskId: string, actorId: string) {
  const subtask = await findSubtaskInProject(projectId, subTaskId);
  await subtask.deleteOne();
  publishProjectEvent(projectId, "subtask:deleted", { _id: subTaskId });
  await safelyNotifyProjectMembers(projectId, actorId, {
    type: "subtask_deleted",
    title: "A subtask was removed",
    body: `Subtask “${subtask.title}” was removed.`,
    href: `/projects/${projectId}/tasks`,
    entityType: "task",
    entityId: subtask.task,
  });
  return subtask;
}
