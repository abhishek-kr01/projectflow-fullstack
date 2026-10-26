"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { MessageCircle, Send, Wifi, WifiOff } from "lucide-react";
import { API_BASE_URL, request } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { User } from "@/lib/types";
import { Avatar, ErrorMessage, LoadingBlock } from "@/components/ui";

type ChatMessage = { _id: string; project: string; task?: string; content: string; createdAt: string; editedAt?: string; author?: User };
export default function ProjectChatPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    try { const data = await request<ChatMessage[]>(`/messages/${projectId}`); setMessages(Array.isArray(data) ? data : []); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load project chat."); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const token = window.localStorage.getItem("projectflow_access_token");
    if (!token) return;
    const source = new EventSource(`${API_BASE_URL}/realtime/${projectId}/events?token=${encodeURIComponent(token)}`);
    source.addEventListener("connected", () => setConnected(true));
    source.onerror = () => setConnected(false);
    const onCreated = (event: Event) => {
      const message = JSON.parse((event as MessageEvent).data).payload as ChatMessage;
      if (!message.task) setMessages((current) => current.some((m) => m._id === message._id) ? current : [...current, message]);
    };
    const onUpdated = (event: Event) => {
      const message = JSON.parse((event as MessageEvent).data).payload as ChatMessage;
      setMessages((current) => current.map((m) => m._id === message._id ? message : m));
    };
    const onDeleted = (event: Event) => {
      const data = JSON.parse((event as MessageEvent).data).payload as { _id: string };
      setMessages((current) => current.filter((m) => m._id !== data._id));
    };
    source.addEventListener("message:created", onCreated);
    source.addEventListener("message:updated", onUpdated);
    source.addEventListener("message:deleted", onDeleted);
    return () => source.close();
  }, [projectId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  async function send(event: FormEvent) {
    event.preventDefault(); const value = content.trim(); if (!value || sending) return;
    setSending(true); setError("");
    try {
      const message = await request<ChatMessage>(`/messages/${projectId}`, { method: "POST", body: JSON.stringify({ content: value }) });
      setMessages((current) => current.some((m) => m._id === message._id) ? current : [...current, message]);
      setContent("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send message."); }
    finally { setSending(false); }
  }
  return <section className="panel flex min-h-[68vh] flex-col overflow-hidden">
    <header className="flex items-center justify-between border-b border-[#eceaf3] p-5">
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#efecff] text-[#6557df]"><MessageCircle size={20}/></div><div><h1 className="text-base font-extrabold">Project conversation</h1><p className="mt-1 text-xs text-[#706d7c]">Keep decisions and quick questions with the work.</p></div></div>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{connected ? <Wifi size={13}/> : <WifiOff size={13}/>} {connected ? "Live" : "Connecting"}</span>
    </header>
    <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
      {loading ? <LoadingBlock /> : messages.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center text-center"><div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0edff] text-[#6557df]"><MessageCircle size={24}/></div><h2 className="font-extrabold">Start the conversation</h2><p className="mt-2 max-w-sm text-sm text-[#706d7d]">Share an update, ask a question, or capture a decision for everyone on this project.</p></div> : messages.map((message) => {
        const own = message.author?._id === user?._id;
        return <article key={message._id} className={`flex items-start gap-3 ${own ? "flex-row-reverse" : ""}`}><Avatar name={message.author?.fullName || message.author?.username || "Member"} src={message.author?.avatar?.url} size="sm"/><div className={`max-w-[85%] sm:max-w-[70%] ${own ? "text-right" : ""}`}><div className="mb-1 flex items-center gap-2 text-[11px] text-[#706d7d]"><span className="font-bold">{own ? "You" : message.author?.fullName || message.author?.username || "Member"}</span><span>{new Date(message.createdAt).toLocaleString()}</span>{message.editedAt && <span>edited</span>}</div><div className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm ${own ? "rounded-tr-sm bg-[#6557df] text-white" : "rounded-tl-sm bg-[#f4f2fa] text-[#37334b]"}`}>{message.content}</div></div></article>;
      })}
      <div ref={bottomRef}/>
    </div>
    {error && <div className="px-5"><ErrorMessage>{error}</ErrorMessage></div>}
    <form onSubmit={send} className="flex items-end gap-3 border-t border-[#eceaf3] p-4 sm:p-5"><textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} rows={2} placeholder="Message your project team…" className="min-h-12 flex-1 resize-y rounded-xl border border-[#e6e3ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#8c80ef]" /><button disabled={!content.trim() || sending} className="btn btn-primary h-12 shrink-0 disabled:opacity-50"><Send size={15}/><span className="hidden sm:inline">{sending ? "Sending…" : "Send"}</span></button></form>
  </section>;
}
