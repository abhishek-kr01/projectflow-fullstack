import { Router } from "express";
import {
  addMembersToProject, createProject, deleteMember, getProjects, getProjectById,
  getProjectMembers, updateProject, updateMemberRole, deleteProject,
} from "../controllers/project.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import { createProjectValidator, addMemberToProjectValidator, updateMemberRoleValidator } from "../validators/index.js";
import { verifyJWT, validateProjectPermission } from "../middlewares/auth.middleware.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

const router = Router();
router.use(verifyJWT);

router.route("/").get(getProjects).post(createProjectValidator(), validate, createProject);
router.route("/:projectId")
  .get(validateProjectPermission(AvailableUserRole), getProjectById)
  .put(validateProjectPermission([UserRolesEnum.ADMIN]), createProjectValidator(), validate, updateProject)
  .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteProject);
router.route("/:projectId/members")
  .get(validateProjectPermission(AvailableUserRole), getProjectMembers)
  .post(validateProjectPermission([UserRolesEnum.ADMIN]), addMemberToProjectValidator(), validate, addMembersToProject);
router.route("/:projectId/members/:userId")
  .put(validateProjectPermission([UserRolesEnum.ADMIN]), updateMemberRoleValidator(), validate, updateMemberRole)
  .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteMember);

export default router;
