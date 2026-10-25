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
