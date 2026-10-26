import type { Response } from "express";

export interface SseInitialEvent {
  event: string;
  data: unknown;
}

export interface SseStream {
  send(eventName: string, data: unknown): boolean;
  onClose(callback: () => void): void;
  close(): void;
  readonly closed: boolean;
}

const EVENT_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9:_-]*$/;

/** Initializes an SSE response and provides safe event writing + lifecycle cleanup. */
export function createSseStream(res: Response, initialEvent?: SseInitialEvent): SseStream {
  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  let closed = false;
  const closeCallbacks = new Set<() => void>();
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    for (const callback of closeCallbacks) {
      try { callback(); } catch (error) { console.error("SSE cleanup failed:", error); }
    }
    closeCallbacks.clear();
  };

  const writeRaw = (chunk: string): boolean => {
    if (closed || res.destroyed || res.writableEnded) return false;
    try { return res.write(chunk); }
    catch { cleanup(); return false; }
  };

  const stream: SseStream = {
    get closed() { return closed; },
    send(eventName, data) {
      if (!EVENT_NAME_PATTERN.test(eventName)) return false;
      let serialized: string;
      try { serialized = JSON.stringify(data) ?? "null"; }
      catch { return false; }
      return writeRaw(`event: ${eventName}
data: ${serialized}

`);
    },
    onClose(callback) {
      if (closed) { callback(); return; }
      closeCallbacks.add(callback);
    },
    close() {
      cleanup();
      if (!res.writableEnded) res.end();
    },
  };

  res.once("close", cleanup);
  res.once("error", cleanup);
  heartbeat = setInterval(() => { writeRaw(": heartbeat\n\n"); }, 25_000);
  heartbeat.unref?.();
  if (initialEvent) stream.send(initialEvent.event, initialEvent.data);
  return stream;
}
