/** Shared browser event bridge for the single project-scoped SSE stream owned by ProjectLayout. */
export interface ProjectRealtimeEnvelope<T = unknown> {
  type: string;
  projectId: string;
  payload: T;
  at: string;
}

export const PROJECT_REALTIME_EVENT = "projectflow:project-event";
export const PROJECT_REALTIME_STATUS_EVENT = "projectflow:project-realtime-status";

// Keep the latest connection state so child pages mounted after the SSE handshake can sync immediately.
let lastProjectRealtimeConnected = false;

export const PROJECT_REALTIME_EVENT_TYPES = [
  "project:updated",
  "project:deleted",
  "member:created",
  "member:updated",
  "member:removed",
  "presence:changed",
  "task:created",
  "task:updated",
  "task:deleted",
  "subtask:created",
  "subtask:updated",
  "subtask:deleted",
  "note:created",
  "note:updated",
  "note:deleted",
  "message:created",
  "message:updated",
  "message:deleted",
  "message:receipt",
] as const;

export function dispatchProjectRealtimeEvent(event: ProjectRealtimeEnvelope): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ProjectRealtimeEnvelope>(PROJECT_REALTIME_EVENT, { detail: event }));
}

export function subscribeProjectRealtime(listener: (event: ProjectRealtimeEnvelope) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ProjectRealtimeEnvelope>).detail;
    if (detail && typeof detail.type === "string" && typeof detail.projectId === "string") listener(detail);
  };
  window.addEventListener(PROJECT_REALTIME_EVENT, handler);
  return () => window.removeEventListener(PROJECT_REALTIME_EVENT, handler);
}

export function dispatchProjectRealtimeStatus(connected: boolean): void {
  lastProjectRealtimeConnected = connected;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ connected: boolean }>(PROJECT_REALTIME_STATUS_EVENT, { detail: { connected } }));
}

export function subscribeProjectRealtimeStatus(listener: (connected: boolean) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => listener(Boolean((event as CustomEvent<{ connected?: boolean }>).detail?.connected));
  window.addEventListener(PROJECT_REALTIME_STATUS_EVENT, handler);
  // ProjectLayout owns the stream and often connects before a chat tab mounts. Replay current state.
  listener(lastProjectRealtimeConnected);
  return () => window.removeEventListener(PROJECT_REALTIME_STATUS_EVENT, handler);
}
