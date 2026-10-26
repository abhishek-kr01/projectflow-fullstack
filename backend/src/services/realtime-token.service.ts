import jwt, { type JwtPayload } from "jsonwebtoken";
import { ApiError } from "../utils/api-error.js";

export type RealtimeStreamScope = "project" | "notifications";
export interface RealtimeStreamClaims extends JwtPayload {
  _id: string;
  purpose: "realtime-stream";
  scope: RealtimeStreamScope;
  projectId?: string;
}

const ISSUER = "projectflow-api";
const AUDIENCE = "projectflow-realtime-stream";
const TTL_SECONDS = 120;

function getStreamSecret(): string {
  // Configure a dedicated REALTIME_TOKEN_SECRET in production. Fallback keeps existing local
  // .env files working; verifyJWT explicitly rejects stream-purpose tokens.
  const secret = process.env.REALTIME_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new ApiError(500, "REALTIME_TOKEN_SECRET or ACCESS_TOKEN_SECRET must be configured.");
  return secret;
}

export function createRealtimeStreamToken(input: { userId: string; scope: RealtimeStreamScope; projectId?: string }): { token: string; expiresInSeconds: number } {
  const payload: RealtimeStreamClaims = {
    _id: input.userId,
    purpose: "realtime-stream",
    scope: input.scope,
    ...(input.scope === "project" && input.projectId ? { projectId: input.projectId } : {}),
  };
  return {
    token: jwt.sign(payload, getStreamSecret(), { expiresIn: TTL_SECONDS, issuer: ISSUER, audience: AUDIENCE }),
    expiresInSeconds: TTL_SECONDS,
  };
}

export function verifyRealtimeStreamToken(token: string): RealtimeStreamClaims {
  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, getStreamSecret(), { issuer: ISSUER, audience: AUDIENCE });
  } catch {
    throw new ApiError(401, "Realtime stream token is invalid or expired.");
  }
  if (typeof decoded === "string" || decoded.purpose !== "realtime-stream" || typeof decoded._id !== "string" || (decoded.scope !== "project" && decoded.scope !== "notifications")) {
    throw new ApiError(401, "Invalid realtime stream token.");
  }
  return decoded as RealtimeStreamClaims;
}
