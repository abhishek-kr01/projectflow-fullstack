import { EventEmitter } from "node:events";

type ProjectEvent = { type: string; projectId: string; payload: unknown; at: string };
const bus = new EventEmitter();
bus.setMaxListeners(0);

export function publishProjectEvent(projectId: string, type: string, payload: unknown) {
  const event: ProjectEvent = { type, projectId, payload, at: new Date().toISOString() };
  bus.emit(`project:${projectId}`, event);
}
export function subscribeProjectEvents(projectId: string, listener: (event: ProjectEvent) => void) {
  const channel = `project:${projectId}`;
  bus.on(channel, listener);
  return () => bus.off(channel, listener);
}
