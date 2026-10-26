import test from "node:test";
import assert from "node:assert/strict";
import { createRealtimeStreamToken, verifyRealtimeStreamToken } from "../src/services/realtime-token.service.js";

const priorSecret = process.env.REALTIME_TOKEN_SECRET;
process.env.REALTIME_TOKEN_SECRET = "test-realtime-token-secret-that-is-long-and-random";

test("realtime stream tokens are short-lived and scoped to project events", () => {
  const projectId = "507f1f77bcf86cd799439011";
  const result = createRealtimeStreamToken({ userId: projectId, scope: "project", projectId });
  const claims = verifyRealtimeStreamToken(result.token);
  assert.equal(result.expiresInSeconds, 120);
  assert.equal(claims._id, projectId);
  assert.equal(claims.scope, "project");
  assert.equal(claims.projectId, projectId);
  assert.equal(claims.purpose, "realtime-stream");
});

test("realtime stream tokens reject scope escalation and malformed tokens", () => {
  assert.throws(() => verifyRealtimeStreamToken("not-a-jwt"), /invalid or expired/i);
  const result = createRealtimeStreamToken({ userId: "507f1f77bcf86cd799439011", scope: "notifications" });
  const claims = verifyRealtimeStreamToken(result.token);
  assert.equal(claims.scope, "notifications");
  assert.equal(claims.projectId, undefined);
});

test.after(() => {
  if (priorSecret === undefined) delete process.env.REALTIME_TOKEN_SECRET;
  else process.env.REALTIME_TOKEN_SECRET = priorSecret;
});
