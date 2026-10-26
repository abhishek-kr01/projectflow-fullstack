import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createProjectNote,
  deleteProjectNote,
  getProjectNote,
  listProjectNotes,
  updateProjectNote,
} from "../services/project-note.service.js";

const actorFromRequest = (req: any) => ({
  id: String(req.user._id),
  role: req.projectRole,
  username: req.user.username,
  fullName: req.user.fullName,
});

export const getNotes = asyncHandler(async (req, res) => {
  const notes = await listProjectNotes(String(req.params.projectId));
  res.status(200).json(new ApiResponse(200, notes, "Notes fetched successfully."));
});

export const createNote = asyncHandler(async (req, res) => {
  const note = await createProjectNote({
    projectId: String(req.params.projectId),
    actor: actorFromRequest(req),
    content: String(req.body.content),
  });
  res.status(201).json(new ApiResponse(201, note, "Note created successfully."));
});

export const getNoteById = asyncHandler(async (req, res) => {
  const note = await getProjectNote(String(req.params.projectId), String(req.params.noteId));
  res.status(200).json(new ApiResponse(200, note, "Note fetched successfully."));
});

export const updateNote = asyncHandler(async (req, res) => {
  const note = await updateProjectNote({
    projectId: String(req.params.projectId),
    noteId: String(req.params.noteId),
    actor: actorFromRequest(req),
    content: req.body.content === undefined ? undefined : String(req.body.content),
  });
  res.status(200).json(new ApiResponse(200, note, "Note updated successfully."));
});

export const deleteNote = asyncHandler(async (req, res) => {
  const note = await deleteProjectNote({
    projectId: String(req.params.projectId),
    noteId: String(req.params.noteId),
    actorId: String(req.user._id),
  });
  res.status(200).json(new ApiResponse(200, note, "Note deleted successfully."));
});
