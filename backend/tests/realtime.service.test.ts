import test from "node:test";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import {
  publishProjectEvent,
  publishUserEvent,
  subscribeProjectEvents,
  subscribeUserEvents,
} from "../src/services/realtime.service.js";

test("project events are delivered to subscribers and contain an ISO timestamp", () => {
  const projectId = `test-project-${randomUUID()}`;
  let received: unknown;
  const unsubscribe = subscribeProjectEvents(projectId, (event) => { received = event; });
  try {
    publishProjectEvent(projectId, "task:created", { taskId: "task-1" });
    assert.ok(received);
    const event = received as { projectId: string; type: string; payload: { taskId: string }; at: string };
    assert.equal(event.projectId, projectId);
    assert.equal(event.type, "task:created");
    assert.equal(event.payload.taskId, "task-1");
    assert.ok(Number.isFinite(Date.parse(event.at)));
  } finally { unsubscribe(); }
});

test("unsubscribed project listeners no longer receive events", () => {
  const projectId = `test-project-${randomUUID()}`;
  let calls = 0;
  const unsubscribe = subscribeProjectEvents(projectId, () => { calls += 1; });
  unsubscribe();
  publishProjectEvent(projectId, "task:updated", {});
  assert.equal(calls, 0);
});

test("user events are isolated by user channel", () => {
  const firstUser = `test-user-${randomUUID()}`;
  const secondUser = `test-user-${randomUUID()}`;
  let firstCount = 0;
  let secondCount = 0;
  const unsubscribeFirst = subscribeUserEvents(firstUser, () => { firstCount += 1; });
  const unsubscribeSecond = subscribeUserEvents(secondUser, () => { secondCount += 1; });
  try {
    publishUserEvent(firstUser, "notification:created", { id: "n1" });
    assert.equal(firstCount, 1);
    assert.equal(secondCount, 0);
  } finally { unsubscribeFirst(); unsubscribeSecond(); }
});
