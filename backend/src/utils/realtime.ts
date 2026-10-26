import { EventEmitter } from "node:events";
import mongoose from "mongoose";
import { ProjectMember } from "../models/projectmember.models.js";

type ProjectEvent = { type: string; projectId: string; payload: unknown; at: string };
type UserEvent = { type: string; userId: string; payload: unknown; at: string };
export type PresenceView = "chat" | "project" | "dashboard" | "workspace" | "background";
export interface PresenceSessionInput {
  userId: string;
  sessionId: string;
  activeProjectId?: string | null;
  activeView?: PresenceView;
}
export interface PresenceSnapshot {
  userId: string;
  online: boolean;
  lastSeenAt: string | null;
}
interface PresenceSession extends PresenceSessionInput { lastSeenAt: number }

const bus = new EventEmitter();
bus.setMaxListeners(0);
const sessionsByUser = new Map<string, Map<string, PresenceSession>>();
const lastSeenByUser = new Map<string, number>();
const PRESENCE_TTL_MS = 45_000;

export function publishProjectEvent(projectId: string, type: string, payload: unknown) {
  const event: ProjectEvent = { type, projectId, payload, at: new Date().toISOString() };
  bus.emit(`project:${projectId}`, event);
}
export function subscribeProjectEvents(projectId: string, listener: (event: ProjectEvent) => void) {
  const channel = `project:${projectId}`;
  bus.on(channel, listener);
  return () => bus.off(channel, listener);
}

export function publishUserEvent(userId: string, type: string, payload: unknown) {
  const event: UserEvent = { type, userId, payload, at: new Date().toISOString() };
  bus.emit(`user:${userId}`, event);
}
export function subscribeUserEvents(userId: string, listener: (event: UserEvent) => void) {
  const channel = `user:${userId}`;
  bus.on(channel, listener);
  return () => bus.off(channel, listener);
}

function getFreshSessions(userId: string) {
  const userSessions = sessionsByUser.get(userId);
  if (!userSessions) return [] as PresenceSession[];
  const now = Date.now();
  return [...userSessions.values()].filter((session) => now - session.lastSeenAt <= PRESENCE_TTL_MS);
}

export function isUserViewingProjectChat(userId: string, projectId: string) {
  return getFreshSessions(userId).some((session) =>
    session.activeProjectId === projectId && session.activeView === "chat",
  );
}

export function getPresenceSnapshot(userId: string): PresenceSnapshot {
  const fresh = getFreshSessions(userId);
  const online = fresh.length > 0;
  const lastSeen = online
    ? Math.max(...fresh.map((session) => session.lastSeenAt))
    : lastSeenByUser.get(userId);
  return { userId, online, lastSeenAt: lastSeen ? new Date(lastSeen).toISOString() : null };
}

async function broadcastUserPresence(userId: string) {
  const snapshot = getPresenceSnapshot(userId);
  const memberships = await ProjectMember.find({ user: userId }).select("project").lean();
  const projectIds = [...new Set(memberships.map((membership: any) => String(membership.project)))];
  for (const projectId of projectIds) publishProjectEvent(projectId, "presence:changed", snapshot);
}

export async function updatePresenceSession(input: PresenceSessionInput) {
  const userId = String(input.userId);
  const sessionId = input.sessionId.trim();
  if (!mongoose.isValidObjectId(userId) || !sessionId || sessionId.length > 120) {
    throw new Error("A valid user and presence session id are required.");
  }
  const wasOnline = getFreshSessions(userId).length > 0;
  const sessions = sessionsByUser.get(userId) || new Map<string, PresenceSession>();
  sessions.set(sessionId, {
    userId,
    sessionId,
    activeProjectId: input.activeProjectId ? String(input.activeProjectId) : null,
    activeView: input.activeView || "workspace",
    lastSeenAt: Date.now(),
  });
  sessionsByUser.set(userId, sessions);
  lastSeenByUser.set(userId, Date.now());
  const context = sessions.get(sessionId)!;
  if (!wasOnline) await broadcastUserPresence(userId);
  return { ...getPresenceSnapshot(userId), activeProjectId: context.activeProjectId, activeView: context.activeView };
}

export async function removePresenceSession(userId: string, sessionId: string) {
  const userSessions = sessionsByUser.get(String(userId));
  if (!userSessions) return getPresenceSnapshot(String(userId));
  const wasOnline = getFreshSessions(String(userId)).length > 0;
  userSessions.delete(sessionId);
  if (userSessions.size === 0) sessionsByUser.delete(String(userId));
  lastSeenByUser.set(String(userId), Date.now());
  const isOnline = getFreshSessions(String(userId)).length > 0;
  if (wasOnline && !isOnline) await broadcastUserPresence(String(userId));
  return getPresenceSnapshot(String(userId));
}

async function sweepStalePresenceSessions() {
  const now = Date.now();
  for (const [userId, sessions] of sessionsByUser.entries()) {
    const wasOnline = [...sessions.values()].some((session) => now - session.lastSeenAt <= PRESENCE_TTL_MS);
    let newestExpiredHeartbeat = lastSeenByUser.get(userId) || 0;
    for (const [sessionId, session] of sessions.entries()) {
      if (now - session.lastSeenAt > PRESENCE_TTL_MS) {
        newestExpiredHeartbeat = Math.max(newestExpiredHeartbeat, session.lastSeenAt);
        sessions.delete(sessionId);
      }
    }
    if (sessions.size === 0) sessionsByUser.delete(userId);
    if (wasOnline && getFreshSessions(userId).length === 0) {
      lastSeenByUser.set(userId, newestExpiredHeartbeat || now);
      try { await broadcastUserPresence(userId); }
      catch (error) { console.error("Presence broadcast failed:", error); }
    }
  }
}

const presenceSweep = setInterval(() => { void sweepStalePresenceSessions(); }, 15_000);
presenceSweep.unref?.();
