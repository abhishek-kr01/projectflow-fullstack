import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createSubTask as createSubTaskService,
  createTask as createTaskService,
  deleteSubTask as deleteSubTaskService,
  deleteTask as deleteTaskService,
  getTask,
  listTasks,
  updateSubTask as updateSubTaskService,
  updateTask as updateTaskService,
} from "../services/task.service.js";
import type { TaskAttachmentInput, TaskActor } from "../services/task.service.js";

const actorFromRequest = (req: any): TaskActor => ({
  id: String(req.user._id),
  role: req.projectRole,
  username: req.user.username,
  fullName: req.user.fullName,
});

export const getTasks = asyncHandler(async (req, res) => {
  const tasks = await listTasks(String(req.params.projectId));
  res.status(200).json(new ApiResponse(200, tasks, "Tasks fetched successfully."));
});

export const createTask = asyncHandler(async (req, res) => {
  const projectId = String(req.params.projectId);
  const files = (req.files || []) as Express.Multer.File[];
  const serverUrl = (process.env.SERVER_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  const attachments: TaskAttachmentInput[] = files.map((file) => ({
    url: `${serverUrl}/images/${encodeURIComponent(file.filename)}`,
    mimetype: file.mimetype,
    size: file.size,
  }));
  const task = await createTaskService({
    projectId,
    actor: actorFromRequest(req),
    title: String(req.body.title),
    description: req.body.description,
    assignedTo: req.body.assignedTo ? String(req.body.assignedTo) : null,
    status: req.body.status ? String(req.body.status) : undefined,
    attachments,
  });
  res.status(201).json(new ApiResponse(201, task, "Task created successfully."));
});

export const getTaskById = asyncHandler(async (req, res) => {
  const task = await getTask(String(req.params.projectId), String(req.params.taskId));
  res.status(200).json(new ApiResponse(200, task, "Task fetched successfully."));
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await updateTaskService({
    projectId: String(req.params.projectId),
    taskId: String(req.params.taskId),
    actor: actorFromRequest(req),
    body: req.body as Record<string, unknown>,
  });
  res.status(200).json(new ApiResponse(200, task, "Task updated successfully."));
});

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await deleteTaskService(String(req.params.projectId), String(req.params.taskId), String(req.user._id));
  res.status(200).json(new ApiResponse(200, task, "Task and its related subtasks deleted successfully."));
});

export const createSubTask = asyncHandler(async (req, res) => {
  const subtask = await createSubTaskService({
    projectId: String(req.params.projectId),
    taskId: String(req.params.taskId),
    actorId: String(req.user._id),
    title: String(req.body.title),
  });
  res.status(201).json(new ApiResponse(201, subtask, "Subtask created successfully."));
});

export const updateSubTask = asyncHandler(async (req, res) => {
  const subtask = await updateSubTaskService({
    projectId: String(req.params.projectId),
    subTaskId: String(req.params.subTaskId),
    actorId: String(req.user._id),
    body: req.body,
  });
  res.status(200).json(new ApiResponse(200, subtask, "Subtask updated successfully."));
});

export const deleteSubTask = asyncHandler(async (req, res) => {
  const subtask = await deleteSubTaskService(String(req.params.projectId), String(req.params.subTaskId), String(req.user._id));
  res.status(200).json(new ApiResponse(200, subtask, "Subtask deleted successfully."));
});
