import { EventEmitter } from "node:events";

export interface ProjectRealtimeEvent<T = unknown> {
  type: string;
  projectId: string;
  payload: T;
  at: string;
}

export interface UserRealtimeEvent<T = unknown> {
  type: string;
  userId: string;
  payload: T;
  at: string;
}

type RealtimeListener<T> = (event: T) => void;
const eventBus = new EventEmitter();
eventBus.setMaxListeners(0);

function safeListener<T>(listener: RealtimeListener<T>): RealtimeListener<T> {
  return (event) => {
    try {
      listener(event);
    } catch (error) {
      // An individual subscriber must never break a business request or other subscribers.
      console.error("Realtime subscriber failed:", error);
    }
  };
}

export function publishProjectEvent<T = unknown>(projectId: string, type: string, payload: T): ProjectRealtimeEvent<T> {
  const event: ProjectRealtimeEvent<T> = {
    type,
    projectId: String(projectId),
    payload,
    at: new Date().toISOString(),
  };
  eventBus.emit(`project:${event.projectId}`, event);
  return event;
}

export function subscribeProjectEvents(projectId: string, listener: RealtimeListener<ProjectRealtimeEvent>) {
  const channel = `project:${String(projectId)}`;
  const safe = safeListener(listener);
  eventBus.on(channel, safe);
  return () => eventBus.off(channel, safe);
}

export function publishUserEvent<T = unknown>(userId: string, type: string, payload: T): UserRealtimeEvent<T> {
  const event: UserRealtimeEvent<T> = {
    type,
    userId: String(userId),
    payload,
    at: new Date().toISOString(),
  };
  eventBus.emit(`user:${event.userId}`, event);
  return event;
}

export function subscribeUserEvents(userId: string, listener: RealtimeListener<UserRealtimeEvent>) {
  const channel = `user:${String(userId)}`;
  const safe = safeListener(listener);
  eventBus.on(channel, safe);
  return () => eventBus.off(channel, safe);
}
