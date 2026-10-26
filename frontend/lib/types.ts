export type UserRole = "admin" | "project_admin" | "member";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface User {
  _id: string;
  username: string;
  email: string;
  fullName?: string;
  avatar?: { url?: string; localPath?: string };
  isEmailVerified?: boolean;
  createdAt?: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  createdBy?: string | User;
  createdAt?: string;
  updatedAt?: string;
  members?: number;
  myRole?: UserRole;
  role?: UserRole;
}

export interface ProjectMember {
  _id?: string;
  user: User;
  project?: string;
  role: UserRole;
  createdAt?: string;
}

export interface Subtask {
  _id: string;
  title: string;
  task: string;
  isCompleted: boolean;
  createdBy?: User;
  createdAt?: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  project: string | Project;
  assignedTo?: User | string;
  assignedBy?: User | string;
  status: TaskStatus | "in-progress";
  attachments?: { url: string; mimetype?: string; size?: number }[];
  subtasks?: Subtask[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectNote {
  _id: string;
  project: string | Project;
  createdBy?: User;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiEnvelope<T> {
  statusCode?: number;
  success?: boolean;
  message?: string;
  data: T;
}

export type AppNotificationType =
  | "task_created" | "task_updated" | "task_assigned" | "task_unassigned" | "task_deleted" | "subtask_created" | "subtask_updated" | "subtask_deleted"
  | "note_created" | "note_updated" | "note_deleted"
  | "message_created" | "message_updated" | "message_deleted"
  | "member_added" | "member_role_updated" | "member_removed" | "project_updated";

export interface AppNotification {
  _id: string;
  recipient: string;
  actor?: User | null;
  project?: Project | string | null;
  type: AppNotificationType;
  title: string;
  body?: string;
  href: string;
  entityType: "project" | "task" | "note" | "message" | "member";
  entityId?: string | null;
  readAt?: string | null;
  createdAt?: string;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}
