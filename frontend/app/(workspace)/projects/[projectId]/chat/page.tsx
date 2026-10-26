"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Check, CheckCheck, MessageCircle, Send, Wifi, WifiOff } from "lucide-react";
import { api, getPresenceSessionId, request } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ProjectChatMessage, ProjectMember, ProjectPresence } from "@/lib/types";
import { subscribeProjectRealtime, subscribeProjectRealtimeStatus } from "@/lib/project-realtime";
import { Avatar, ErrorMessage, LoadingBlock } from "@/components/ui";

type ReceiptState = "sent" | "delivered" | "read";

function getReceiptState(message: ProjectChatMessage, recipientCount: number, ownId: string): { state: ReceiptState; title: string } {
  const delivered = (message.deliveredTo || []).map(String).filter((id) => id !== ownId).length;
  const read = (message.readBy || []).map(String).filter((id) => id !== ownId).length;
  if (recipientCount > 0 && read >= recipientCount) return { state: "read", title: `Read by all ${recipientCount} teammate${recipientCount === 1 ? "" : "s"}` };
  if (recipientCount > 0 && delivered >= recipientCount) return { state: "delivered", title: `Delivered to all ${recipientCount} teammate${recipientCount === 1 ? "" : "s"}` };
  if (read > 0 || delivered > 0) return { state: "sent", title: `Seen by ${read}; delivered to ${delivered} of ${recipientCount}` };
  return { state: "sent", title: "Sent to ProjectFlow" };
}

export default function ProjectChatPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [presenceByUser, setPresenceByUser] = useState<Record<string, ProjectPresence>>({});
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userId = String(user?._id || "");

  const load = useCallback(async () => {
    try {
      const data = await request<ProjectChatMessage[]>(`/messages/${projectId}?limit=100`);
      const rows = Array.isArray(data) ? data : [];
      setMessages(rows);
      setError("");
      if (userId && document.visibilityState === "visible") {
        const unseenIds = rows.filter((item) => String(item.author?._id || "") !== userId).map((item) => item._id);
        if (unseenIds.length) void api.messages.markReceipts(projectId, unseenIds, "read").catch(() => undefined);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load project chat."); }
    finally { setLoading(false); }
  }, [projectId, userId]);

  useEffect(() => { void load(); }, [load]);

  // Register the active chat immediately, then clear old chat notifications for this project.
  // DashboardShell continues the heartbeat while the tab remains open.
  useEffect(() => {
    let cancelled = false;
    const activeView = document.visibilityState === "visible" ? "chat" : "background";
    void (async () => {
      try {
        await api.realtime.updatePresence({ sessionId: getPresenceSessionId(), activeProjectId: projectId, activeView });
      } catch { /* Chat must still work if presence is temporarily unavailable. */ }
      try {
        await api.notifications.markProjectMessagesRead(projectId);
        if (!cancelled) window.dispatchEvent(new Event("projectflow:notification-changed"));
      } catch { /* Notification state is best-effort; messages remain available. */ }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const loadTeam = useCallback(async () => {
    try {
      const [nextMembers, nextPresence] = await Promise.all([
        api.projects.members(projectId),
        api.realtime.projectPresence(projectId),
      ]);
      setMembers(nextMembers);
      setPresenceByUser(Object.fromEntries(nextPresence.map((item) => [item.userId, item])));
    } catch { /* A presence outage should not interrupt messaging. */ }
  }, [projectId]);

  useEffect(() => { void loadTeam(); }, [loadTeam]);

  // Subscribe to the single project stream owned by ProjectLayout instead of opening a second SSE connection.
  useEffect(() => {
    const unsubscribeStatus = subscribeProjectRealtimeStatus(setConnected);
    const unsubscribeEvents = subscribeProjectRealtime((event) => {
      if (event.projectId !== projectId) return;
      if (event.type === "presence:changed") {
        const presence = event.payload as ProjectPresence;
        if (presence?.userId) setPresenceByUser((current) => ({ ...current, [presence.userId]: { ...current[presence.userId], ...presence } }));
        return;
      }
      if (["member:created", "member:updated", "member:removed"].includes(event.type)) {
        void loadTeam();
        return;
      }
      if (event.type === "message:created") {
        const message = event.payload as ProjectChatMessage;
        if (!message?._id || message.task) return;
        setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)));
        const authorId = String(typeof message.author === "object" ? message.author?._id || "" : message.author || "");
        if (authorId && authorId !== userId) {
          const receipt = document.visibilityState === "visible" ? "read" : "delivered";
          void api.messages.markReceipts(projectId, [message._id], receipt).catch(() => undefined);
        }
        return;
      }
      if (event.type === "message:updated") {
        const message = event.payload as ProjectChatMessage;
        if (message?._id) setMessages((current) => current.map((item) => item._id === message._id ? { ...item, ...message } : item));
        return;
      }
      if (event.type === "message:deleted") {
        const payload = event.payload as { _id?: string };
        if (payload?._id) setMessages((current) => current.filter((item) => item._id !== payload._id));
        return;
      }
      if (event.type === "message:receipt") {
        const receipt = event.payload as { messageId?: string; deliveredTo?: string[]; readBy?: string[] };
        if (receipt?.messageId) setMessages((current) => current.map((item) => item._id === receipt.messageId ? { ...item, deliveredTo: receipt.deliveredTo || [], readBy: receipt.readBy || [] } : item));
      }
    });
    return () => { unsubscribeStatus(); unsubscribeEvents(); };
  }, [projectId, userId, loadTeam]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function send(event: FormEvent) {
    event.preventDefault(); const value = content.trim(); if (!value || sending) return;
    setSending(true); setError("");
    try {
      const message = await request<ProjectChatMessage>(`/messages/${projectId}`, { method: "POST", body: JSON.stringify({ content: value }) });
      setMessages((current) => current.some((m) => m._id === message._id) ? current : [...current, message]);
      setContent("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send message."); }
    finally { setSending(false); }
  }

  const onlineCount = Object.values(presenceByUser).filter((item) => item.online).length;
  const recipientCount = Math.max(0, members.length - 1);

  return <section className="panel flex min-h-[68vh] flex-col overflow-hidden">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceaf3] p-5">
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#efecff] text-[#6557df]"><MessageCircle size={20}/></div><div><h1 className="text-base font-extrabold">Project conversation</h1><p className="mt-1 text-xs text-[#706d7c]">Keep decisions and quick questions with the work.</p><div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[#5e5a70]"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf8f2] px-2 py-1 font-bold text-[#247c5e]"><span className="h-1.5 w-1.5 rounded-full bg-[#36b37e]"/>{onlineCount} online</span><span>{members.length} project member{members.length === 1 ? "" : "s"}</span></div></div></div>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{connected ? <Wifi size={13}/> : <WifiOff size={13}/>} {connected ? "Live" : "Connecting"}</span>
    </header>
    <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
      {loading ? <LoadingBlock /> : messages.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center text-center"><div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0edff] text-[#6557df]"><MessageCircle size={24}/></div><h2 className="font-extrabold">Start the conversation</h2><p className="mt-2 max-w-sm text-sm text-[#706d7d]">Share an update, ask a question, or capture a decision for everyone on this project.</p></div> : messages.map((message) => {
        const authorId = String(message.author?._id || "");
        const own = authorId === userId;
        const authorOnline = Boolean(authorId && presenceByUser[authorId]?.online);
        const receipt = own ? getReceiptState(message, recipientCount, userId) : null;
        return <article key={message._id} className={`flex items-start gap-3 ${own ? "flex-row-reverse" : ""}`}>
          <span className="relative inline-flex h-fit"><Avatar name={message.author?.fullName || message.author?.username || "Member"} src={message.author?.avatar?.url} size="md"/>{authorOnline && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#36b37e]" title="Online" aria-label="Online"/>}</span>
          <div className={`max-w-[85%] sm:max-w-[70%] ${own ? "text-right" : ""}`}>
            <div className={`mb-1 flex flex-wrap items-center gap-2 text-[11px] text-[#706d7d] ${own ? "justify-end" : ""}`}><span className="font-bold">{own ? "You" : message.author?.fullName || message.author?.username || "Member"}</span><span>{new Date(message.createdAt).toLocaleString()}</span>{message.editedAt && <span>edited</span>}{own && receipt && <span className="inline-flex items-center" title={receipt.title} aria-label={receipt.title}>{receipt.state === "sent" ? <Check size={14} strokeWidth={2.2} className="text-[#777489]"/> : <CheckCheck size={15} strokeWidth={2.2} className={receipt.state === "read" ? "text-[#2697e7]" : "text-[#777489]"}/>}</span>}</div>
            <div className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm ${own ? "rounded-tr-sm bg-[#6557df] text-white" : "rounded-tl-sm bg-[#f4f2fa] text-[#37334b]"}`}>{message.content}</div>
          </div>
        </article>;
      })}
      <div ref={bottomRef}/>
    </div>
    {error && <div className="px-5"><ErrorMessage>{error}</ErrorMessage></div>}
    <form onSubmit={send} className="flex items-end gap-3 border-t border-[#eceaf3] p-4 sm:p-5"><textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} rows={2} placeholder="Message your project team…" className="min-h-12 flex-1 resize-y rounded-xl border border-[#e6e3ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#8c80ef]"/><button disabled={!content.trim() || sending} className="btn btn-primary h-12 shrink-0 disabled:opacity-50"><Send size={15}/><span className="hidden sm:inline">{sending ? "Sending…" : "Send"}</span></button></form>
  </section>;
}
