import { ProjectNote } from "../models/projectnote.models.js";
import { Project } from "../models/project.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const getNotes = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const notes = await ProjectNote.find({ project: projectId }).populate("createdBy", "username email fullName avatar").sort({ updatedAt: -1 });
  return res.status(200).json(new ApiResponse(200, notes, "Notes fetched successfully."));
});

export const createNote = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId).select("_id");
  if (!project) throw new ApiError(404, "Project not found.");
  const note = await ProjectNote.create({ project: projectId, content: String(req.body.content).trim(), createdBy: req.user._id });
  const populated = await ProjectNote.findById(note._id).populate("createdBy", "username email fullName avatar");
  return res.status(201).json(new ApiResponse(201, populated, "Note created successfully."));
});

export const getNoteById = asyncHandler(async (req, res) => {
  const note = await ProjectNote.findOne({ _id: req.params.noteId, project: req.params.projectId }).populate("createdBy", "username email fullName avatar");
  if (!note) throw new ApiError(404, "Note not found in this project.");
  return res.status(200).json(new ApiResponse(200, note, "Note fetched successfully."));
});

export const updateNote = asyncHandler(async (req, res) => {
  const note = await ProjectNote.findOne({ _id: req.params.noteId, project: req.params.projectId });
  if (!note) throw new ApiError(404, "Note not found in this project.");
  if (req.body.content !== undefined) note.content = String(req.body.content).trim();
  await note.save();
  const populated = await ProjectNote.findById(note._id).populate("createdBy", "username email fullName avatar");
  return res.status(200).json(new ApiResponse(200, populated, "Note updated successfully."));
});

export const deleteNote = asyncHandler(async (req, res) => {
  const note = await ProjectNote.findOneAndDelete({ _id: req.params.noteId, project: req.params.projectId });
  if (!note) throw new ApiError(404, "Note not found in this project.");
  return res.status(200).json(new ApiResponse(200, note, "Note deleted successfully."));
});
