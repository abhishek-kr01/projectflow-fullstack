import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  addProjectMember,
  changeProjectMemberRole,
  createProject as createProjectService,
  deleteProject as deleteProjectService,
  getProject,
  listProjectMembers,
  listProjects,
  removeProjectMember,
  updateProject as updateProjectService,
} from "../services/project.service.js";

const actorFromRequest = (req: any) => ({
  id: String(req.user._id),
  username: req.user.username,
  fullName: req.user.fullName,
});

export const getProjects = asyncHandler(async (req, res) => {
  const projects = await listProjects(String(req.user._id));
  res.status(200).json(new ApiResponse(200, projects, "Projects fetched successfully."));
});

export const getProjectById = asyncHandler(async (req, res) => {
  const project = await getProject(String(req.params.projectId), String(req.projectRole || "member"));
  res.status(200).json(new ApiResponse(200, project, "Project fetched successfully."));
});

export const createProject = asyncHandler(async (req, res) => {
  const project = await createProjectService({
    actorId: String(req.user._id),
    name: String(req.body.name),
    description: req.body.description,
  });
  res.status(201).json(new ApiResponse(201, project, "Project created successfully."));
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await updateProjectService({
    projectId: String(req.params.projectId),
    actor: actorFromRequest(req),
    name: String(req.body.name),
    description: req.body.description,
  });
  res.status(200).json(new ApiResponse(200, project, "Project updated successfully."));
});

export const deleteProject = asyncHandler(async (req, res) => {
  const result = await deleteProjectService(String(req.params.projectId));
  res.status(200).json(new ApiResponse(200, result, "Project and its related data deleted successfully."));
});

export const addMembersToProject = asyncHandler(async (req, res) => {
  const membership = await addProjectMember({
    projectId: String(req.params.projectId),
    actor: actorFromRequest(req),
    email: String(req.body.email),
    role: String(req.body.role),
  });
  res.status(201).json(new ApiResponse(201, membership, "Project member added successfully."));
});

export const getProjectMembers = asyncHandler(async (req, res) => {
  const members = await listProjectMembers(String(req.params.projectId));
  res.status(200).json(new ApiResponse(200, members, "Project members fetched successfully."));
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const member = await changeProjectMemberRole({
    projectId: String(req.params.projectId),
    userId: String(req.params.userId),
    actor: actorFromRequest(req),
    newRole: String(req.body.newRole),
  });
  res.status(200).json(new ApiResponse(200, member, "Project member role updated successfully."));
});

export const deleteMember = asyncHandler(async (req, res) => {
  const membership = await removeProjectMember({
    projectId: String(req.params.projectId),
    userId: String(req.params.userId),
    actorId: String(req.user._id),
  });
  res.status(200).json(new ApiResponse(200, membership, "Project member removed successfully."));
});
