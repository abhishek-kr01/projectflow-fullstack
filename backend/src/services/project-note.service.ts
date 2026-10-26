import { ProjectNote } from "../models/projectnote.models.js";
import { Project } from "../models/project.models.js";
import { ApiError } from "../utils/api-error.js";
import { UserRolesEnum } from "../utils/constants.js";
import { publishProjectEvent } from "./realtime.service.js";
import { safelyNotifyProjectMembers } from "./notification.service.js";

export interface NoteActor { id: string; role?: string; username?: string; fullName?: string }

export async function listProjectNotes(projectId: string) {
  return ProjectNote.find({ project: projectId })
    .populate("createdBy", "username email fullName avatar")
    .sort({ updatedAt: -1 });
}

export async function createProjectNote(input: { projectId: string; actor: NoteActor; content: string }) {
  const project = await Project.findById(input.projectId).select("_id");
  if (!project) throw new ApiError(404, "Project not found.");
  const note = await ProjectNote.create({ project: input.projectId, content: input.content.trim(), createdBy: input.actor.id });
  const populated = await ProjectNote.findById(note._id).populate("createdBy", "username email fullName avatar");
  publishProjectEvent(input.projectId, "note:created", populated);
  await safelyNotifyProjectMembers(input.projectId, input.actor.id, {
    type: "note_created",
    title: "A project note was added",
    body: `${input.actor.fullName || input.actor.username || "A teammate"} added a note.`,
    href: `/projects/${input.projectId}/notes`,
    entityType: "note",
    entityId: note._id,
  });
  return populated;
}

export async function getProjectNote(projectId: string, noteId: string) {
  const note = await ProjectNote.findOne({ _id: noteId, project: projectId }).populate("createdBy", "username email fullName avatar");
  if (!note) throw new ApiError(404, "Note not found in this project.");
  return note;
}

export async function updateProjectNote(input: { projectId: string; noteId: string; actor: NoteActor; content?: string }) {
  const note = await ProjectNote.findOne({ _id: input.noteId, project: input.projectId });
  if (!note) throw new ApiError(404, "Note not found in this project.");
  if (input.actor.role === UserRolesEnum.MEMBER && String(note.createdBy) !== input.actor.id) {
    throw new ApiError(403, "Members can only edit notes they created.");
  }
  if (input.content !== undefined) note.content = input.content.trim();
  await note.save();
  const populated = await ProjectNote.findById(note._id).populate("createdBy", "username email fullName avatar");
  publishProjectEvent(input.projectId, "note:updated", populated);
  await safelyNotifyProjectMembers(input.projectId, input.actor.id, {
    type: "note_updated",
    title: "A project note was updated",
    body: `${input.actor.fullName || input.actor.username || "A teammate"} updated a project note.`,
    href: `/projects/${input.projectId}/notes`,
    entityType: "note",
    entityId: note._id,
  });
  return populated;
}

export async function deleteProjectNote(input: { projectId: string; noteId: string; actorId: string }) {
  const note = await ProjectNote.findOneAndDelete({ _id: input.noteId, project: input.projectId });
  if (!note) throw new ApiError(404, "Note not found in this project.");
  publishProjectEvent(input.projectId, "note:deleted", { _id: input.noteId });
  await safelyNotifyProjectMembers(input.projectId, input.actorId, {
    type: "note_deleted",
    title: "A project note was deleted",
    body: "A project note was removed.",
    href: `/projects/${input.projectId}/notes`,
    entityType: "note",
    entityId: input.noteId,
  });
  return note;
}
