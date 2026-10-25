import { Router } from "express";
import {
  getTasks, createTask, getTaskById, updateTask, deleteTask,
  createSubTask, updateSubTask, deleteSubTask,
} from "../controllers/task.controllers.js";
import { verifyJWT, validateProjectPermission } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { createTaskValidator, updateTaskValidator, createSubTaskValidator, updateSubTaskValidator } from "../validators/index.js";
import { UserRolesEnum, AvailableUserRole } from "../utils/constants.js";

const router = Router();
router.use(verifyJWT);
router.get("/:projectId", validateProjectPermission(AvailableUserRole), getTasks);
router.post("/:projectId", validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]), upload.array("attachments", 5), createTaskValidator(), validate, createTask);
router.get("/:projectId/t/:taskId", validateProjectPermission(AvailableUserRole), getTaskById);
router.put("/:projectId/t/:taskId", validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]), updateTaskValidator(), validate, updateTask);
router.delete("/:projectId/t/:taskId", validateProjectPermission([UserRolesEnum.ADMIN]), deleteTask);
router.post("/:projectId/t/:taskId/subtasks", validateProjectPermission(AvailableUserRole), createSubTaskValidator(), validate, createSubTask);
router.put("/:projectId/st/:subTaskId", validateProjectPermission(AvailableUserRole), updateSubTaskValidator(), validate, updateSubTask);
router.delete("/:projectId/st/:subTaskId", validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]), deleteSubTask);
export default router;
