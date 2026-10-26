"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AtSign, Check, CheckCheck, MessageCircle, Reply, Send, Wifi, WifiOff, X } from "lucide-react";
import { api, getPresenceSessionId, request } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ProjectChatMessage, ProjectMember, ProjectPresence, User } from "@/lib/types";
import { subscribeProjectRealtime, subscribeProjectRealtimeStatus } from "@/lib/project-realtime";
import { Avatar, ErrorMessage, LoadingBlock } from "@/components/ui";

type ReceiptState = "sent" | "delivered" | "read";

function getReceiptState(message: ProjectChatMessage, recipientCount: number, ownId: string): { state: ReceiptState; title: string } {
  const delivered = (message.deliveredTo || []).map(String).filter((id) => id !== ownId).length;
  const read = (message.readBy || []).map(String).filter((id) => id !== ownId).length;
  if (recipientCount > 0 && read >= recipientCount) return { state: "read", title: `Read by all ${recipientCount} teammates` };
  if (recipientCount > 0 && delivered >= recipientCount) return { state: "delivered", title: `Delivered to all ${recipientCount} teammates` };
  if (read > 0 || delivered > 0) return { state: "sent", title: `Seen by ${read}; delivered to ${delivered} of ${recipientCount}` };
  return { state: "sent", title: "Sent to ProjectFlow" };
}

function getUserId(value: User | string | null | undefined): string {
  return typeof value === "string" ? value : String(value?._id || "");
}

function getReply(message: ProjectChatMessage) {
  return message.replyTo && typeof message.replyTo === "object" ? message.replyTo : null;
}

function renderMessageContent(content: string) {
  const parts = content.split(/(@[a-zA-Z0-9_.-]+)/g);
  return parts.map((part, index) => part.startsWith("@")
    ? <span key={`${part}-${index}`} className="rounded bg-[#e9e5ff] px-1 font-semibold text-[#5142c9]">{part}</span>
    : <span key={`${part}-${index}`}>{part}</span>);
}

export default function ProjectChatPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [presenceByUser, setPresenceByUser] = useState<Record<string, ProjectPresence>>({});
  const [content, setContent] = useState("");
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ProjectChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const userId = String(user?._id || "");

  const load = useCallback(async () => {
    try {
      const data = await request<ProjectChatMessage[]>(`/messages/${projectId}?limit=100`);
      const rows = Array.isArray(data) ? data : [];
      setMessages(rows);
      setError("");
      if (userId && document.visibilityState === "visible") {
        const unseenIds = rows.filter((item) => getUserId(item.author) !== userId).map((item) => item._id);
        if (unseenIds.length) void api.messages.markReceipts(projectId, unseenIds, "read").catch(() => undefined);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load project chat."); }
    finally { setLoading(false); }
  }, [projectId, userId]);

  useEffect(() => { void load(); }, [load]);

  // Entering the chat marks existing project-message notifications as read and updates presence.
  useEffect(() => {
    let cancelled = false;
    const activeView = document.visibilityState === "visible" ? "chat" : "background";
    void (async () => {
      try { await api.realtime.updatePresence({ sessionId: getPresenceSessionId(), activeProjectId: projectId, activeView }); } catch { /* Best-effort presence. */ }
      try {
        await api.notifications.markProjectMessagesRead(projectId);
        if (!cancelled) window.dispatchEvent(new Event("projectflow:notification-changed"));
      } catch { /* Chat stays usable if notification state is temporarily unavailable. */ }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const loadTeam = useCallback(async () => {
    try {
      const [nextMembers, nextPresence] = await Promise.all([api.projects.members(projectId), api.realtime.projectPresence(projectId)]);
      setMembers(nextMembers);
      setPresenceByUser(Object.fromEntries(nextPresence.map((item) => [item.userId, item])));
    } catch { /* Presence is supplementary; preserve chat during a temporary outage. */ }
  }, [projectId]);
  useEffect(() => { void loadTeam(); }, [loadTeam]);

  useEffect(() => {
    const unsubscribeStatus = subscribeProjectRealtimeStatus(setConnected);
    const unsubscribeEvents = subscribeProjectRealtime((event) => {
      if (event.projectId !== projectId) return;
      if (event.type === "presence:changed") {
        const presence = event.payload as ProjectPresence;
        if (presence?.userId) setPresenceByUser((current) => ({ ...current, [presence.userId]: { ...current[presence.userId], ...presence } }));
        return;
      }
      if (["member:created", "member:updated", "member:removed"].includes(event.type)) { void loadTeam(); return; }
      if (event.type === "message:created") {
        const message = event.payload as ProjectChatMessage;
        if (!message?._id || message.task) return;
        setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)));
        const authorId = getUserId(message.author);
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

  const suggestions = mentionQuery === null ? [] : members
    .filter((member) => member.user && member.user._id !== userId)
    .filter((member) => `${member.user.username} ${member.user.fullName || ""}`.toLowerCase().includes(mentionQuery.toLowerCase()))
    .slice(0, 6);

  function updateComposer(value: string, cursor: number) {
    setContent(value);
    const prefix = value.slice(0, cursor);
    const match = prefix.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);
    setMentionQuery(match ? match[1] : null);
    // Do not keep stale mention IDs after the text has been deleted or changed.
    setMentionUserIds((current) => current.filter((id) => {
      const member = members.find((item) => item.user?._id === id);
      if (!member?.user?.username) return false;
      const escaped = member.user.username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?:^|\\s)@${escaped}(?=$|\\s|[.,!?])`, "i").test(value);
    }));
  }

  function selectMention(member: ProjectMember) {
    const mentionedUser = member.user;
    if (!mentionedUser?._id) return;
    const value = content;
    const cursor = composerRef.current?.selectionStart ?? value.length;
    const prefix = value.slice(0, cursor);
    const match = prefix.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);
    if (!match) return;
    const atIndex = prefix.length - match[1].length - 1;
    const before = value.slice(0, atIndex);
    const after = value.slice(cursor);
    const insertion = `@${mentionedUser.username} `;
    const nextValue = `${before}${insertion}${after}`;
    setContent(nextValue);
    setMentionUserIds((current) => [...new Set([...current, mentionedUser._id])]);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const element = composerRef.current;
      if (!element) return;
      element.focus();
      const nextCursor = before.length + insertion.length;
      element.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function chooseReply(message: ProjectChatMessage) {
    setReplyingTo(message);
    composerRef.current?.focus();
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const value = content.trim();
    if (!value || sending) return;
    setSending(true); setError("");
    const mentionIds = mentionUserIds.filter((id) => {
      const username = members.find((member) => member.user?._id === id)?.user?.username;
      if (!username) return false;
      const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?:^|\\s)@${escaped}(?=$|\\s|[.,!?])`, "i").test(value);
    });
    try {
      const message = await api.messages.create(projectId, {
        content: value,
        ...(replyingTo ? { replyToId: replyingTo._id } : {}),
        mentionUserIds: mentionIds,
      });
      setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message]);
      setContent(""); setMentionUserIds([]); setMentionQuery(null); setReplyingTo(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send message."); }
    finally { setSending(false); }
  }

  const onlineCount = Object.values(presenceByUser).filter((item) => item.online).length;
  const recipientCount = Math.max(0, members.length - 1);

  return <section className="panel flex min-h-[68vh] flex-col overflow-hidden">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceaf3] p-5">
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#efecff] text-[#6557df]"><MessageCircle size={20}/></div><div><h1 className="text-base font-extrabold">Project conversation</h1><p className="mt-1 text-xs text-[#706d7c]">Reply to a teammate or mention them with @username.</p><div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[#5e5a70]"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf8f2] px-2 py-1 font-bold text-[#247c5e]"><span className="h-1.5 w-1.5 rounded-full bg-[#36b37e]"/>{onlineCount} online</span><span>{members.length} project member{members.length === 1 ? "" : "s"}</span></div></div></div>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{connected ? <Wifi size={13}/> : <WifiOff size={13}/>} {connected ? "Live" : "Reconnecting…"}</span>
    </header>

    <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
      {loading ? <LoadingBlock /> : messages.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center text-center"><div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0edff] text-[#6557df]"><MessageCircle size={24}/></div><h2 className="font-extrabold">Start the conversation</h2><p className="mt-2 max-w-sm text-sm text-[#706d7d]">Share an update, reply to a teammate, or mention someone who needs to see it.</p></div> : messages.map((message) => {
        const author = typeof message.author === "object" ? message.author : undefined;
        const authorId = getUserId(message.author);
        const own = authorId === userId;
        const authorOnline = Boolean(authorId && presenceByUser[authorId]?.online);
        const receipt = own ? getReceiptState(message, recipientCount, userId) : null;
        const reply = getReply(message);
        const replyAuthor = reply && typeof reply.author === "object" ? reply.author : undefined;
        return <article key={message._id} className={`group flex items-start gap-3 ${own ? "flex-row-reverse" : ""}`}>
          <span className="relative inline-flex h-fit"><Avatar name={author?.fullName || author?.username || "Member"} src={author?.avatar?.url} size="md"/>{authorOnline && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#36b37e]" title="Online" aria-label="Online"/>}</span>
          <div className={`max-w-[88%] sm:max-w-[72%] ${own ? "text-right" : ""}`}>
            <div className={`mb-1 flex flex-wrap items-center gap-2 text-[11px] text-[#706d7d] ${own ? "justify-end" : ""}`}><span className="font-bold">{own ? "You" : author?.fullName || author?.username || "Member"}</span><span>{new Date(message.createdAt).toLocaleString()}</span>{message.editedAt && <span>edited</span>}{own && receipt && <span className="inline-flex items-center" title={receipt.title} aria-label={receipt.title}>{receipt.state === "sent" ? <Check size={14} strokeWidth={2.2} className="text-[#777489]"/> : <CheckCheck size={15} strokeWidth={2.2} className={receipt.state === "read" ? "text-[#2697e7]" : "text-[#777489]"}/>}</span>}</div>
            {reply && <button type="button" onClick={() => document.getElementById(`message-${reply._id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className={`mb-1 block w-full rounded-xl border border-[#ded9f7] bg-[#faf9ff] px-3 py-2 text-left text-[11px] text-[#5c5871] ${own ? "ml-auto" : ""}`}><span className="font-bold">Replying to {replyAuthor?.fullName || replyAuthor?.username || "a message"}</span><span className="mt-1 block truncate">{reply.content}</span></button>}
            <div id={`message-${message._id}`} className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm ${own ? "rounded-tr-sm bg-[#6557df] text-white" : "rounded-tl-sm bg-[#f4f2fa] text-[#37334b]"}`}>{renderMessageContent(message.content)}</div>
            <div className={`mt-1 flex gap-2 ${own ? "justify-end" : "justify-start"}`}><button type="button" onClick={() => chooseReply(message)} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold text-[#6d6790] opacity-100 transition hover:bg-[#f0edff] hover:text-[#5142c9] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"><Reply size={12}/> Reply</button></div>
          </div>
        </article>;
      })}
      <div ref={bottomRef}/>
    </div>
    {error && <div className="px-5 pb-2"><ErrorMessage>{error}</ErrorMessage></div>}
    <form onSubmit={send} className="relative border-t border-[#eceaf3] p-4 sm:p-5">
      {replyingTo && <div className="mb-3 flex items-start gap-3 rounded-xl border border-[#ded9f7] bg-[#faf9ff] p-3"><Reply size={15} className="mt-0.5 shrink-0 text-[#6255d8]"/><div className="min-w-0 flex-1"><p className="text-[11px] font-extrabold">Replying to {replyingTo.author?.fullName || replyingTo.author?.username || "message"}</p><p className="mt-1 truncate text-[11px] text-[#68647c]">{replyingTo.content}</p></div><button type="button" className="icon-btn h-7 w-7" aria-label="Cancel reply" onClick={() => setReplyingTo(null)}><X size={13}/></button></div>}
      {mentionQuery !== null && <div className="mb-2 max-h-48 overflow-y-auto rounded-xl border border-[#e6e2f3] bg-white p-1.5 shadow-lg" role="listbox" aria-label="Mention a project member">{suggestions.length ? suggestions.map((member) => <button key={member.user._id} type="button" onClick={() => selectMention(member)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-[#f5f2ff]"><Avatar name={member.user.fullName || member.user.username} src={member.user.avatar?.url} size="xs"/><span className="min-w-0"><span className="block text-xs font-bold">{member.user.fullName || member.user.username}</span><span className="text-[10px] text-[#706d7d]">@{member.user.username}</span></span><AtSign size={13} className="ml-auto text-[#7b70df]"/></button>) : <p className="px-3 py-2 text-xs text-[#706d7d]">No matching members.</p>}</div>}
      <div className="flex items-end gap-3"><textarea ref={composerRef} value={content} onChange={(event) => updateComposer(event.target.value, event.currentTarget.selectionStart)} maxLength={5000} rows={2} placeholder="Message your project team… Type @ to mention someone" className="min-h-12 flex-1 resize-y rounded-xl border border-[#e6e3ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#8c80ef]"/><button type="submit" disabled={!content.trim() || sending} className="btn btn-primary h-12 shrink-0 disabled:opacity-50"><Send size={15}/><span className="hidden sm:inline">{sending ? "Sending…" : "Send"}</span></button></div>
    </form>
  </section>;
}
