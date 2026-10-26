"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, CircleCheck, ClipboardList, FileText, FolderKanban, MessageCircle, UserPlus, ArrowUpRight, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { AppNotification } from "@/lib/types";
import { PageHeading } from "@/components/ui";

type ViewFilter = "all" | "unread";

function notificationIcon(type: AppNotification["type"]) {
  if (type.startsWith("message")) return MessageCircle;
  if (type.startsWith("note")) return FileText;
  if (type.startsWith("member")) return UserPlus;
  if (type.startsWith("project")) return FolderKanban;
  if (type === "task_deleted") return CircleCheck;
  return ClipboardList;
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await api.notifications.list(50);
      setItems(result.items || []);
      setUnreadCount(result.unreadCount || 0);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Notifications could not be loaded.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const onChanged = () => { void load(); };
    window.addEventListener("projectflow:notification-changed", onChanged);
    return () => window.removeEventListener("projectflow:notification-changed", onChanged);
  }, [load]);

  const visibleItems = useMemo(() => filter === "unread" ? items.filter((item) => !item.readAt) : items, [filter, items]);

  const handleOpen = async (item: AppNotification) => {
    if (!item.readAt) {
      const readAt = new Date().toISOString();
      setItems((current) => current.map((notification) => notification._id === item._id ? { ...notification, readAt } : notification));
      setUnreadCount((current) => Math.max(0, current - 1));
      try { await api.notifications.markRead(item._id); }
      catch { void load(); }
      window.dispatchEvent(new Event("projectflow:notification-changed"));
    }
    if (item.href?.startsWith("/")) router.push(item.href);
  };

  const markAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
      setUnreadCount(0);
      window.dispatchEvent(new Event("projectflow:notification-changed"));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not mark notifications as read."); }
  };

  const remove = async (id: string) => {
    const previous = items;
    setItems((current) => current.filter((item) => item._id !== id));
    const deleted = previous.find((item) => item._id === id);
    if (deleted && !deleted.readAt) setUnreadCount((current) => Math.max(0, current - 1));
    try { await api.notifications.remove(id); window.dispatchEvent(new Event("projectflow:notification-changed")); }
    catch (e) { setItems(previous); setUnreadCount((count) => count + (deleted && !deleted.readAt ? 1 : 0)); setError(e instanceof Error ? e.message : "Could not delete notification."); }
  };

  return <div className="space-y-6">
    <PageHeading
      eyebrow="Your activity"
      title="Notifications"
      description="Stay on top of project updates, task assignments, notes and team conversations."
      action={<button onClick={() => void markAllRead()} disabled={!unreadCount} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#e6e2f0] bg-white px-4 text-xs font-[750] text-[#5144bd] shadow-sm transition hover:bg-[#f7f5ff] disabled:cursor-not-allowed disabled:text-[#aaa6b8]"><CheckCheck size={15}/> Mark all as read</button>}
    />

    {error && <div role="alert" className="rounded-xl border border-[#f1ccd4] bg-[#fff6f8] px-4 py-3 text-xs leading-5 text-[#a53e52]">{error}</div>}

    <section className="overflow-hidden rounded-2xl border border-[#eae7f2] bg-white shadow-[0_8px_30px_rgba(39,31,76,.035)]">
      <div className="flex flex-col gap-3 border-b border-[#efedf5] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><h2 className="text-sm font-[800] text-[#2c2942]">Activity inbox</h2><p className="mt-1 text-[11px] text-[#777489]">{unreadCount} unread · {items.length} recent notifications</p></div>
        <div className="inline-flex w-fit rounded-xl bg-[#f5f3fa] p-1" role="group" aria-label="Filter notifications">
          <button onClick={() => setFilter("all")} className={`rounded-lg px-3 py-2 text-[11px] font-[750] ${filter === "all" ? "bg-white text-[#37324f] shadow-sm" : "text-[#777489] hover:text-[#37324f]"}`}>All activity</button>
          <button onClick={() => setFilter("unread")} className={`rounded-lg px-3 py-2 text-[11px] font-[750] ${filter === "unread" ? "bg-white text-[#37324f] shadow-sm" : "text-[#777489] hover:text-[#37324f]"}`}>Unread {unreadCount > 0 ? `(${unreadCount})` : ""}</button>
        </div>
      </div>
      {loading && items.length === 0 ? <div className="space-y-3 p-5"><div className="skeleton h-16 w-full"/><div className="skeleton h-16 w-full"/><div className="skeleton h-16 w-full"/></div> : null}
      {!loading && !error && visibleItems.length === 0 && <div className="px-6 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1edff] text-[#6152d8]"><Bell size={20}/></span><h3 className="mt-4 text-sm font-[800] text-[#302d46]">{filter === "unread" ? "You're all caught up" : "No notifications yet"}</h3><p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-[#777489]">When teammates update tasks, add project notes, or send chat messages, the activity will appear here.</p><Link href="/projects" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#5d50d9] px-4 py-2.5 text-xs font-[800] text-white transition hover:bg-[#493cc4]">Go to projects <ArrowUpRight size={14}/></Link></div>}
      <div className="divide-y divide-[#f0eef6]">
        {visibleItems.map((item) => {
          const Icon = notificationIcon(item.type);
          const projectName = typeof item.project === "object" && item.project ? item.project.name : "Project activity";
          return <div key={item._id} className={`group flex items-start gap-3 px-4 py-4 transition-colors sm:px-5 ${item.readAt ? "bg-white" : "bg-[#faf9ff]"}`}>
            <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.readAt ? "bg-[#f1eff6] text-[#777489]" : "bg-[#e9e5ff] text-[#5c4ecb]"}`}><Icon size={17}/></span>
            <button className="min-w-0 flex-1 text-left" onClick={() => void handleOpen(item)}>
              <span className="flex items-start gap-2"><span className="flex-1 text-xs font-[800] leading-5 text-[#302d46]">{item.title}</span>{!item.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#6557e8]"/>}</span>
              {item.body && <span className="mt-1 block text-xs leading-5 text-[#69667d]">{item.body}</span>}
              <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#858196]"><span>{projectName}</span>{item.createdAt && <><span aria-hidden="true">·</span><span>{formatDate(item.createdAt)}</span></>}</span>
            </button>
            <button onClick={() => void remove(item._id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9995a8] opacity-100 transition hover:bg-[#fff0f2] hover:text-[#ba4155] sm:opacity-0 sm:group-hover:opacity-100" aria-label="Delete notification" title="Delete notification"><Trash2 size={14}/></button>
          </div>;
        })}
      </div>
    </section>
  </div>;
}
