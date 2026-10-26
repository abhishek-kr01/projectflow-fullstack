import type { AppNotification, NotificationList, PresenceView, Project, ProjectChatMessage, ProjectMember, ProjectNote, ProjectPresence, Task, User } from "@/lib/types";

const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
export const API_BASE_URL = rawBase.replace(/\/+$/, "");
const PROJECT_CACHE_KEY = "projectflow_project_cache";

function readProjectCache(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROJECT_CACHE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && item._id) as Project[] : [];
  } catch { return []; }
}

function writeProjectCache(projects: Project[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(PROJECT_CACHE_KEY, JSON.stringify(projects.slice(0, 100))); } catch { /* Cache is a convenience only. */ }
}

function cacheProject(project: Project) {
  if (!project?._id) return;
  const cache = readProjectCache();
  writeProjectCache([project, ...cache.filter((item) => item._id !== project._id)]);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("projectflow:cache-changed"));
}

export function getPresenceSessionId() {
  if (typeof window === "undefined") return "";
  const key = "projectflow_presence_session_id";
  let id = window.sessionStorage.getItem(key);
  if (!id) {
    id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(key, id);
  }
  return id;
}

export function clearProjectCache() {
  if (typeof window !== "undefined") window.localStorage.removeItem(PROJECT_CACHE_KEY);
}

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
  }
}

function readAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("projectflow_access_token");
}

async function performFetch(path: string, init: RequestInit, token: string | null): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (init.body && !(typeof FormData !== "undefined" && init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
}

function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("projectflow_access_token");
  window.localStorage.removeItem("projectflow_refresh_token");
  window.dispatchEvent(new Event("projectflow:session-expired"));
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = readAccessToken();
  let response: Response;
  try {
    response = await performFetch(path, init, token);
  } catch {
    throw new ApiRequestError(`Cannot reach the API at ${API_BASE_URL}. Check the backend is running and NEXT_PUBLIC_API_BASE_URL is correct.`, 0);
  }

  const isAuthBootstrap = /\/auth\/(login|register|refresh-token|forgot-password|reset-password)/.test(path);
  if (response.status === 401 && token && !isAuthBootstrap && typeof window !== "undefined") {
    const storedRefreshToken = window.localStorage.getItem("projectflow_refresh_token");
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storedRefreshToken ? { refreshToken: storedRefreshToken } : {}),
      });
      const refreshPayload = await refreshResponse.json().catch(() => null);
      const refreshData = refreshPayload?.data;
      if (refreshResponse.ok && refreshPayload?.success !== false && refreshData?.accessToken) {
        token = refreshData.accessToken as string;
        window.localStorage.setItem("projectflow_access_token", token);
        if (refreshData.refreshToken) window.localStorage.setItem("projectflow_refresh_token", String(refreshData.refreshToken));
        window.dispatchEvent(new Event("projectflow:token-refreshed"));
        response = await performFetch(path, init, token);
      } else {
        clearStoredSession();
      }
    } catch {
      // Preserve the original API failure; a later request may succeed if the network recovers.
    }
  }

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    const message = payload?.message || payload?.errors?.[0]?.message || payload?.errors?.[0]?.msg || `Request failed (${response.status})`;
    throw new ApiRequestError(message, response.status, payload?.errors);
  }

  if (payload && typeof payload === "object" && "data" in payload) return payload.data as T;
  return payload as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const api = {
  auth: {
    login: (body: { email: string; password: string }) => request<{ user: User; accessToken: string; refreshToken?: string }>("/auth/login", json("POST", body)),
    register: (body: { email: string; username: string; password: string; fullName?: string }) => request<{ user: User }>("/auth/register", json("POST", body)),
    verifyEmail: (token: string) => request<{ isEmailVerified: boolean }>(`/auth/verify-email/${encodeURIComponent(token)}`, { method: "GET" }),
    currentUser: () => request<User>("/auth/current-user", json("POST")),
    logout: () => request<unknown>("/auth/logout", json("POST")),
    forgotPassword: (email: string) => request<unknown>("/auth/forgot-password", json("POST", { email })),
    resetPassword: (token: string, newPassword: string) => request<unknown>(`/auth/reset-password/${encodeURIComponent(token)}`, json("POST", { newPassword })),
    changePassword: (oldPassword: string, newPassword: string) => request<unknown>("/auth/change-password", json("POST", { oldPassword, newPassword })),
    resendVerification: () => request<unknown>("/auth/resend-email-verification", json("POST")),
  },
  projects: {
    list: async () => {
      const raw = await request<any[]>("/projects", { method: "GET" });
      const serverProjects = Array.isArray(raw) ? raw.map((item) => {
        const project = item?.project && typeof item.project === "object" ? item.project : item;
        return { ...project, myRole: item?.role || project?.myRole } as Project;
      }).filter((item) => item?._id) : [];
      // The API response is authoritative: do not reintroduce deleted or inaccessible cached projects.
      writeProjectCache(serverProjects);
      return serverProjects;
    },
    get: async (id: string) => { const project = await request<Project>(`/projects/${id}`, { method: "GET" }); if (project?._id) cacheProject(project); return project; },
    create: async (body: { name: string; description?: string }) => { const project = await request<Project>("/projects", json("POST", body)); if (project?._id) cacheProject(project); return project; },
    update: async (id: string, body: { name: string; description?: string }) => { const project = await request<Project>(`/projects/${id}`, json("PUT", body)); if (project?._id) cacheProject(project); return project; },
    remove: async (id: string) => { const result = await request<unknown>(`/projects/${id}`, json("DELETE")); writeProjectCache(readProjectCache().filter((project) => project._id !== id)); if (typeof window !== "undefined") window.dispatchEvent(new Event("projectflow:cache-changed")); return result; },
    members: (id: string) => request<ProjectMember[]>(`/projects/${id}/members`, { method: "GET" }),
    addMember: (id: string, email: string, role: string) => request<unknown>(`/projects/${id}/members`, json("POST", { email, role })),
    updateMemberRole: (id: string, userId: string, newRole: string) => request<unknown>(`/projects/${id}/members/${userId}`, json("PUT", { newRole })),
    removeMember: (id: string, userId: string) => request<unknown>(`/projects/${id}/members/${userId}`, json("DELETE")),
  },
  tasks: {
    list: (projectId: string) => request<Task[]>(`/tasks/${projectId}`, { method: "GET" }),
    get: (projectId: string, taskId: string) => request<Task>(`/tasks/${projectId}/t/${taskId}`, { method: "GET" }),
    create: (projectId: string, body: { title: string; description?: string; assignedTo?: string; status?: string }) => request<Task>(`/tasks/${projectId}`, json("POST", body)),
    createWithAttachments: (projectId: string, body: { title: string; description?: string; assignedTo?: string; status?: string }, attachments: File[]) => {
      const form = new FormData();
      form.append("title", body.title);
      form.append("description", body.description || "");
      form.append("status", body.status || "todo");
      if (body.assignedTo) form.append("assignedTo", body.assignedTo);
      attachments.forEach((file) => form.append("attachments", file));
      return request<Task>(`/tasks/${projectId}`, { method: "POST", body: form });
    },
    update: (projectId: string, taskId: string, body: { title?: string; description?: string; status?: string; assignedTo?: string }) => request<Task>(`/tasks/${projectId}/t/${taskId}`, json("PUT", body)),
    remove: (projectId: string, taskId: string) => request<unknown>(`/tasks/${projectId}/t/${taskId}`, json("DELETE")),
    createSubtask: (projectId: string, taskId: string, title: string) => request<any>(`/tasks/${projectId}/t/${taskId}/subtasks`, json("POST", { title })),
    updateSubtask: (projectId: string, subTaskId: string, body: { title?: string; isCompleted?: boolean }) => request<any>(`/tasks/${projectId}/st/${subTaskId}`, json("PUT", body)),
    removeSubtask: (projectId: string, subTaskId: string) => request<unknown>(`/tasks/${projectId}/st/${subTaskId}`, json("DELETE")),
  },
  messages: {
    markReceipts: (projectId: string, messageIds: string[], status: "delivered" | "read") =>
      request<Array<{ messageId: string; deliveredTo: string[]; readBy: string[] }>>(`/messages/${projectId}/receipts`, json("POST", { messageIds, status })),
  },
  realtime: {
    updatePresence: (input: { sessionId: string; activeProjectId?: string | null; activeView?: PresenceView; status?: "online" | "offline" }) =>
      request<ProjectPresence>("/realtime/presence", json("POST", input)),
    projectPresence: (projectId: string) => request<ProjectPresence[]>(`/realtime/${projectId}/presence`, { method: "GET" }),
  },
  notes: {
    list: (projectId: string) => request<ProjectNote[]>(`/notes/${projectId}`, { method: "GET" }),
    get: (projectId: string, noteId: string) => request<ProjectNote>(`/notes/${projectId}/n/${noteId}`, { method: "GET" }),
    create: (projectId: string, content: string) => request<ProjectNote>(`/notes/${projectId}`, json("POST", { content })),
    update: (projectId: string, noteId: string, content: string) => request<ProjectNote>(`/notes/${projectId}/n/${noteId}`, json("PUT", { content })),
    remove: (projectId: string, noteId: string) => request<unknown>(`/notes/${projectId}/n/${noteId}`, json("DELETE")),
  },
  notifications: {
    list: (limit = 30) => request<NotificationList>(`/notifications?limit=${Math.min(Math.max(limit, 1), 50)}`, { method: "GET" }),
    markRead: (notificationId: string) => request<AppNotification>(`/notifications/${notificationId}/read`, json("PATCH")),
    markAllRead: () => request<{ modifiedCount: number }>("/notifications/read-all", json("PATCH")),
    markProjectMessagesRead: (projectId: string) => request<{ modifiedCount: number }>(`/notifications/projects/${projectId}/messages/read`, json("PATCH")),
    remove: (notificationId: string) => request<{ _id: string }>(`/notifications/${notificationId}`, json("DELETE")),
  },
};

export const normalizeStatus = (status?: string) => {
  if (status === "in-progress" || status === "in_progress") return "in_progress" as const;
  if (status === "done") return "done" as const;
  return "todo" as const;
};

export const statusForApi = (status: string) => status === "in-progress" ? "in_progress" : status;

export function getId(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "_id" in value) return String((value as { _id: unknown })._id);
  return undefined;
}
