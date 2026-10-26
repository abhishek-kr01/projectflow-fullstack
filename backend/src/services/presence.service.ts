import mongoose from "mongoose";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiError } from "../utils/api-error.js";
import { publishProjectEvent } from "./realtime.service.js";
import { requireProjectMembership } from "./project-access.service.js";

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
export interface ProjectPresenceEntry extends PresenceSnapshot {
  user: { _id: string; username?: string; fullName?: string; avatar?: unknown } | null;
}
interface PresenceSession extends PresenceSessionInput { lastSeenAt: number }

const sessionsByUser = new Map<string, Map<string, PresenceSession>>();
const lastSeenByUser = new Map<string, number>();
const PRESENCE_TTL_MS = 45_000;
const PRESENCE_SWEEP_INTERVAL_MS = 15_000;

function getFreshSessions(userId: string): PresenceSession[] {
  const userSessions = sessionsByUser.get(String(userId));
  if (!userSessions) return [];
  const now = Date.now();
  return [...userSessions.values()].filter((session) => now - session.lastSeenAt <= PRESENCE_TTL_MS);
}

export function isUserViewingProjectChat(userId: string, projectId: string): boolean {
  return getFreshSessions(userId).some((session) =>
    session.activeProjectId === String(projectId) && session.activeView === "chat",
  );
}

export function getPresenceSnapshot(userId: string): PresenceSnapshot {
  const fresh = getFreshSessions(userId);
  const online = fresh.length > 0;
  const lastSeen = online
    ? Math.max(...fresh.map((session) => session.lastSeenAt))
    : lastSeenByUser.get(String(userId));
  return { userId: String(userId), online, lastSeenAt: lastSeen ? new Date(lastSeen).toISOString() : null };
}

async function broadcastUserPresence(userId: string): Promise<void> {
  const snapshot = getPresenceSnapshot(userId);
  const memberships = await ProjectMember.find({ user: userId }).select("project").lean();
  const projectIds = [...new Set(memberships.map((membership) => String(membership.project)))];
  for (const projectId of projectIds) publishProjectEvent(projectId, "presence:changed", snapshot);
}

export async function updatePresenceSession(input: PresenceSessionInput) {
  const userId = String(input.userId);
  const sessionId = input.sessionId.trim();
  if (!mongoose.isValidObjectId(userId) || !sessionId || sessionId.length > 120) {
    throw new ApiError(400, "A valid user and presence session id are required.");
  }

  const activeProjectId = input.activeProjectId ? String(input.activeProjectId) : null;
  if (activeProjectId) {
    await requireProjectMembership({ projectId: activeProjectId, userId });
  }

  const wasOnline = getFreshSessions(userId).length > 0;
  const sessions = sessionsByUser.get(userId) || new Map<string, PresenceSession>();
  sessions.set(sessionId, {
    userId,
    sessionId,
    activeProjectId,
    activeView: input.activeView || "workspace",
    lastSeenAt: Date.now(),
  });
  sessionsByUser.set(userId, sessions);
  lastSeenByUser.set(userId, Date.now());
  const context = sessions.get(sessionId)!;
  if (!wasOnline) await broadcastUserPresence(userId);

  return { ...getPresenceSnapshot(userId), activeProjectId: context.activeProjectId, activeView: context.activeView };
}

export async function removePresenceSession(userId: string, sessionId: string): Promise<PresenceSnapshot> {
  const normalizedUserId = String(userId);
  const userSessions = sessionsByUser.get(normalizedUserId);
  if (!userSessions) return getPresenceSnapshot(normalizedUserId);

  const wasOnline = getFreshSessions(normalizedUserId).length > 0;
  userSessions.delete(sessionId);
  if (userSessions.size === 0) sessionsByUser.delete(normalizedUserId);
  lastSeenByUser.set(normalizedUserId, Date.now());
  const isOnline = getFreshSessions(normalizedUserId).length > 0;
  if (wasOnline && !isOnline) await broadcastUserPresence(normalizedUserId);
  return getPresenceSnapshot(normalizedUserId);
}

export async function listProjectPresence(projectId: string): Promise<ProjectPresenceEntry[]> {
  if (!mongoose.isValidObjectId(projectId)) throw new ApiError(400, "A valid project id is required.");
  const memberships = await ProjectMember.find({ project: projectId })
    .populate("user", "username fullName avatar")
    .lean();
  return memberships.map((membership) => {
    const person = membership.user as unknown as { _id?: unknown; username?: string; fullName?: string; avatar?: unknown } | null;
    const userId = String(person?._id || membership.user);
    return {
      ...getPresenceSnapshot(userId),
      user: person?._id ? { _id: userId, username: person.username, fullName: person.fullName, avatar: person.avatar } : null,
    };
  });
}

async function sweepStalePresenceSessions(): Promise<void> {
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

const presenceSweep = setInterval(() => { void sweepStalePresenceSessions(); }, PRESENCE_SWEEP_INTERVAL_MS);
presenceSweep.unref?.();

export function stopPresenceSweep(): void {
  clearInterval(presenceSweep);
}
