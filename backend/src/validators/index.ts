import { body, param } from "express-validator";
import { AvailableUserRole, AvailableTaskStatuses } from "../utils/constants.js";

export const userRegisterValidator = () => [
  body("email").trim().notEmpty().withMessage("Email is required.").isEmail().withMessage("Email is invalid.").normalizeEmail(),
  body("username").trim().notEmpty().withMessage("Username is required.").isLength({ min: 3, max: 30 }).withMessage("Username must be 3–30 characters.").matches(/^[a-z0-9_.-]+$/).withMessage("Username can use lowercase letters, numbers, dots, underscores and hyphens."),
  body("password").isString().isLength({ min: 8, max: 128 }).withMessage("Password must be at least 8 characters."),
  body("fullName").optional({ nullable: true }).trim().isLength({ max: 80 }).withMessage("Full name must be 80 characters or fewer."),
];

export const userLoginValidator = () => [
  body("email").trim().notEmpty().withMessage("Email is required.").isEmail().withMessage("Email is invalid.").normalizeEmail(),
  body("password").isString().notEmpty().withMessage("Password is required."),
];

export const userChangeCurrentPasswordValidator = () => [
  body("oldPassword").isString().notEmpty().withMessage("Current password is required."),
  body("newPassword").isString().isLength({ min: 8, max: 128 }).withMessage("New password must be at least 8 characters."),
];

export const userForgotPasswordValidator = () => [body("email").trim().notEmpty().isEmail().withMessage("A valid email is required.").normalizeEmail()];
export const userResetForgotPasswordValidator = () => [body("newPassword").isString().isLength({ min: 8, max: 128 }).withMessage("Password must be at least 8 characters.")];

export const createProjectValidator = () => [
  body("name").trim().notEmpty().withMessage("Project name is required.").isLength({ max: 100 }).withMessage("Project name must be 100 characters or fewer."),
  body("description").optional({ nullable: true }).trim().isLength({ max: 2000 }).withMessage("Description must be 2,000 characters or fewer."),
];

export const addMemberToProjectValidator = () => [
  body("email").trim().notEmpty().withMessage("Email is required.").isEmail().withMessage("Email is invalid.").normalizeEmail(),
  body("role").isIn(AvailableUserRole.filter((role) => role !== "admin")).withMessage("Role must be project_admin or member."),
];

export const updateMemberRoleValidator = () => [
  body("newRole").isIn(AvailableUserRole.filter((role) => role !== "admin")).withMessage("Role must be project_admin or member."),
];

export const createTaskValidator = () => [
  body("title").trim().notEmpty().withMessage("Task title is required.").isLength({ max: 160 }).withMessage("Task title must be 160 characters or fewer."),
  body("description").optional({ nullable: true }).trim().isLength({ max: 5000 }).withMessage("Description must be 5,000 characters or fewer."),
  body("status").optional().isIn(AvailableTaskStatuses).withMessage("Status must be todo, in_progress, or done."),
  body("assignedTo").optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage("Assignee id is invalid."),
];

export const updateTaskValidator = () => [
  body("title").optional().trim().notEmpty().withMessage("Task title cannot be empty.").isLength({ max: 160 }),
  body("description").optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body("status").optional().isIn(AvailableTaskStatuses).withMessage("Status must be todo, in_progress, or done."),
  body("assignedTo").optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage("Assignee id is invalid."),
];

export const createSubTaskValidator = () => [body("title").trim().notEmpty().withMessage("Subtask title is required.").isLength({ max: 160 })];
export const updateSubTaskValidator = () => [
  body("title").optional().trim().notEmpty().withMessage("Subtask title cannot be empty.").isLength({ max: 160 }),
  body("isCompleted").optional().isBoolean().withMessage("isCompleted must be a boolean."),
];
export const createNoteValidator = () => [body("content").trim().notEmpty().withMessage("Note content is required.").isLength({ max: 10000 }).withMessage("Notes must be 10,000 characters or fewer.")];
export const updateNoteValidator = () => [body("content").optional().trim().notEmpty().withMessage("Note content cannot be empty.").isLength({ max: 10000 })];
export const mongoIdParamValidator = (key: string) => [param(key).isMongoId().withMessage(`${key} is invalid.`)];
