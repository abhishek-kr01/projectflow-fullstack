export const UserRolesEnum = {
  ADMIN: "admin",
  PROJECT_ADMIN: "project_admin",
  MEMBER: "member",
} as const;

export type UserRole = (typeof UserRolesEnum)[keyof typeof UserRolesEnum];
export const AvailableUserRole: UserRole[] = Object.values(UserRolesEnum);

export const TaskStatusEnum = {
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  DONE: "done",
} as const;

export type TaskStatus = (typeof TaskStatusEnum)[keyof typeof TaskStatusEnum];
export const AvailableTaskStatuses: TaskStatus[] = Object.values(TaskStatusEnum);
// Kept for callers that used the original export's misspelling.
export const AvailableTaskStatues = AvailableTaskStatuses;

export const COOKIE_NAMES = {
  ACCESS: "accessToken",
  REFRESH: "refreshToken",
} as const;
