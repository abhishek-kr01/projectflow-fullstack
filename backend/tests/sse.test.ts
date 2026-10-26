import { EventEmitter } from "node:events";
import test from "node:test";
import assert from "node:assert/strict";
import type { Response } from "express";
import { createSseStream } from "../src/utils/sse.js";

class MockResponse extends EventEmitter {
  statusCode = 200;
  headers: Record<string, string> = {};
  chunks: string[] = [];
  writableEnded = false;
  destroyed = false;
  status(code: number) { this.statusCode = code; return this; }
  set(headers: Record<string, string>) { this.headers = headers; return this; }
  flushHeaders() { /* no-op */ }
  write(chunk: string) { this.chunks.push(chunk); return true; }
  end() { this.writableEnded = true; this.emit("close"); }
}

test("SSE stream emits a named JSON event and heartbeat headers", () => {
  const response = new MockResponse();
  const stream = createSseStream(response as unknown as Response, { event: "connected", data: { ok: true } });
  try {
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["Content-Type"], "text/event-stream; charset=utf-8");
    assert.match(response.chunks.join(""), /event: connected\ndata: \{"ok":true\}\n\n/);
    assert.equal(stream.closed, false);
  } finally { stream.close(); }
  assert.equal(stream.closed, true);
});

test("SSE cleanup callbacks run once when the response closes", () => {
  const response = new MockResponse();
  const stream = createSseStream(response as unknown as Response);
  let cleanupCalls = 0;
  stream.onClose(() => { cleanupCalls += 1; });
  response.emit("close");
  stream.close();
  assert.equal(cleanupCalls, 1);
  assert.equal(stream.closed, true);
});
