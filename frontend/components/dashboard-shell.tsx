"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, api, getPresenceSessionId } from "@/lib/api";
import { openAuthenticatedSse } from "@/lib/authenticated-sse";
import { useAuth } from "@/lib/auth-context";
import type { AppNotification, Project } from "@/lib/types";
import { Avatar, BrandMark } from "@/components/ui";
import { Bell, CheckCheck, ChevronDown, ChevronLeft, CircleHelp, Command, FileText, FolderKanban, LayoutDashboard, LogOut, Menu, MessageCircle, Plus, Search, Settings2, Sparkles, UserPlus, X, CheckSquare, CircleCheck, ClipboardList } from "lucide-react";

const mainNav = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "All projects", href: "/projects", icon: FolderKanban },
  { label: "Task tracker", href: "/tasks", icon: CheckSquare },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [projectLoading, setProjectLoading] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    if (status !== "authenticated") return;
    setProjectLoading(true);
    try { setProjects(await api.projects.list()); } catch { setProjects([]); }
    finally { setProjectLoading(false); }
  }, [status]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") void loadProjects();
  }, [status, pathname, router, loadProjects]);

  useEffect(() => {
    const refresh = () => { if (status === "authenticated") void loadProjects(); };
    window.addEventListener("projectflow:cache-changed", refresh);
    return () => window.removeEventListener("projectflow:cache-changed", refresh);
  }, [status, loadProjects]);

  const loadNotifications = useCallback(async () => {
    if (status !== "authenticated") return;
    setNotificationLoading(true);
    try {
      const result = await api.notifications.list(30);
      setNotifications(result.items || []);
      setUnreadCount(result.unreadCount || 0);
    } catch {
      // Notifications are a convenience; keep the rest of the workspace usable if this request fails.
    } finally { setNotificationLoading(false); }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void loadNotifications();

    const closeStream = openAuthenticatedSse({
      scope: "notifications",
      path: "/realtime/users/notifications/events",
      eventNames: ["notification:created", "notification:read", "notification:read-all", "notification:read-context", "notification:deleted"],
      onStatus: () => undefined,
      onEvent: (eventName, raw) => {
        if (eventName === "notification:created") {
          const envelope = raw as { payload?: AppNotification } | AppNotification;
          const notification = (envelope as { payload?: AppNotification })?.payload || envelope as AppNotification;
          if (!notification?._id) return;
          setNotifications((current) => [notification, ...current.filter((item) => item._id !== notification._id)].slice(0, 30));
          if (!notification.readAt) setUnreadCount((current) => current + 1);
          window.dispatchEvent(new Event("projectflow:notification-changed"));
          return;
        }
        window.dispatchEvent(new Event("projectflow:notification-changed"));
        if (eventName === "notification:read-all") setUnreadCount(0);
        else if (eventName === "notification:deleted" || eventName === "notification:read-context" || eventName === "notification:read") void loadNotifications();
      },
    });
    const refresh = () => { void loadNotifications(); };
    window.addEventListener("projectflow:notification-changed", refresh);
    return () => {
      closeStream();
      window.removeEventListener("projectflow:notification-changed", refresh);
    };
  }, [status, loadNotifications]);

  // Keep per-tab presence current so chat notifications can be suppressed while that chat is visible.
  useEffect(() => {
    if (status !== "authenticated" || !user?._id) return;
    const sessionId = getPresenceSessionId();
    const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
    const activeProjectId = projectMatch?.[1] || null;
    const resolveView = () => {
      if (document.visibilityState !== "visible") return "background" as const;
      if (pathname.endsWith("/chat")) return "chat" as const;
      if (activeProjectId) return "project" as const;
      if (pathname === "/dashboard") return "dashboard" as const;
      return "workspace" as const;
    };
    const heartbeat = () => {
      void api.realtime.updatePresence({ sessionId, activeProjectId, activeView: resolveView() }).catch(() => undefined);
    };
    const closePresence = () => {
      const token = window.localStorage.getItem("projectflow_access_token");
      if (!token) return;
      void fetch(`${API_BASE_URL}/realtime/presence`, {
        method: "POST", keepalive: true, credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId, status: "offline" }),
      }).catch(() => undefined);
    };
    heartbeat();
    const timer = window.setInterval(heartbeat, 15_000);
    window.addEventListener("focus", heartbeat);
    window.addEventListener("pageshow", heartbeat);
    window.addEventListener("pagehide", closePresence);
    document.addEventListener("visibilitychange", heartbeat);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", heartbeat);
      window.removeEventListener("pageshow", heartbeat);
      window.removeEventListener("pagehide", closePresence);
      document.removeEventListener("visibilitychange", heartbeat);
    };
  }, [status, user?._id, pathname]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const openNotification = async (notification: AppNotification) => {
    setNotificationsOpen(false);
    if (!notification.readAt) {
      setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnreadCount((current) => Math.max(0, current - 1));
      try { await api.notifications.markRead(notification._id); }
      catch { void loadNotifications(); }
      window.dispatchEvent(new Event("projectflow:notification-changed"));
    }
    if (notification.href?.startsWith("/")) router.push(notification.href);
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.notifications.markAllRead();
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
      setUnreadCount(0);
      window.dispatchEvent(new Event("projectflow:notification-changed"));
    } catch { void loadNotifications(); }
  };

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/projects?search=${encodeURIComponent(value)}` : "/projects");
  };

  const onLogout = async () => {
    try { await api.realtime.updatePresence({ sessionId: getPresenceSessionId(), status: "offline" }); } catch { /* Session logout must proceed even if presence cannot be updated. */ }
    await logout();
    router.replace("/login");
  };

  const displayName = user?.fullName?.trim() || user?.username || "there";
  const firstName = displayName.split(/\s+/)[0];

  const sidebar = <>
    <div className="flex h-[76px] items-center gap-3 px-6">
      <BrandMark size="md" />
      <div className="min-w-0"><div className="text-[17px] font-[850] tracking-[-.055em]">project<span className="text-[#5b49ce]">flow</span></div><div className="mt-0.5 text-[9px] font-[750] uppercase tracking-[.16em] text-[#6f6e7b]">Your team's space</div></div>
      <button className="icon-btn ml-auto h-8 w-8 border-transparent md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={17}/></button>
    </div>
    <div className="px-4 pt-5">
      <div className="mb-2 px-3 text-[9px] font-[850] uppercase tracking-[.15em] text-[#6f6e7a]">Workspace</div>
      <nav className="space-y-1">
        {mainNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-[650] transition-colors ${active ? "bg-[#f0eeff] text-[#5b4cda]" : "text-[#6f6d83] hover:bg-[#f8f7fc] hover:text-[#302d46]"}`}>
            <Icon size={17} strokeWidth={active ? 2.3 : 1.9} /><span className="flex-1">{item.label}</span>{item.label === "Task tracker" && <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[9px] font-[800] text-[#716c86]">↗</span>}
          </Link>;
        })}
      </nav>
    </div>
    <div className="px-4 pt-8">
      <div className="mb-2 flex items-center justify-between px-3"><div className="text-[9px] font-[850] uppercase tracking-[.15em] text-[#6f6e7a]">Your projects</div><button className="flex h-6 w-6 items-center justify-center rounded-md text-[#706d80] hover:bg-[#f0eeff] hover:text-[#5b4cda]" onClick={() => router.push("/projects")} aria-label="Create a project"><Plus size={15}/></button></div>
      <nav className="space-y-1">
        {projectLoading && <div className="space-y-2 px-3 py-2"><div className="skeleton h-3 w-4/5"/><div className="skeleton h-3 w-3/5"/><div className="skeleton h-3 w-2/3"/></div>}
        {!projectLoading && projects.slice(0, 6).map((project, index) => {
          const active = pathname.includes(`/projects/${project._id}`);
          const colors = ["#eae6ff", "#e1f5ed", "#fff0dc", "#e6efff", "#ffe6ec", "#f0e7ff"];
          const textColors = ["#6050c5", "#217358", "#8c5e1d", "#4165a2", "#974d61", "#7551a8"];
          return <Link key={project._id} href={`/projects/${project._id}`} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] transition-colors ${active ? "bg-[#f0eeff] text-[#5b4cda]" : "text-[#6f6d83] hover:bg-[#f8f7fc] hover:text-[#302d46]"}`}><span className="flex h-6 w-6 items-center justify-center rounded-[8px] text-[10px] font-[850]" style={{ background: colors[index % colors.length], color: textColors[index % textColors.length] }}>{project.name?.trim()?.slice(0, 1).toUpperCase() || "P"}</span><span className="min-w-0 flex-1 truncate font-[650]">{project.name}</span><ChevronLeft size={12} className="rotate-180 opacity-0 transition-opacity group-hover:opacity-50"/></Link>;
        })}
        {!projectLoading && projects.length === 0 && <div className="px-3 py-2 text-[11px] leading-5 text-[#706d7b]">Projects you create or join will show up here.</div>}
      </nav>
      <Link href="/projects" className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-[650] text-[#706d7e] hover:bg-[#f8f7fc] hover:text-[#5b49ce]"><Plus size={14}/> Browse all projects</Link>
    </div>
    <div className="mt-auto p-4">
      <div className="relative overflow-hidden rounded-[17px] bg-[#f4f1ff] p-4">
        <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full border-[14px] border-white/50"/><div className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-[#6a5be1] shadow-sm"><Sparkles size={16}/></div>
        <div className="relative mt-3 text-[12px] font-[800] text-[#393456]">A little more focus.</div><div className="relative mt-1 text-[10px] leading-4 text-[#6f6b92]">One clear plan makes a big difference.</div>
      </div>
      <div className="mt-4 flex items-center gap-2.5 rounded-xl px-2 py-2">
        <Avatar name={displayName} src={typeof user?.avatar === "object" ? user?.avatar?.url : undefined}/><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-[750] text-[#3b384f]">{displayName}</div><div className="truncate text-[10px] text-[#706d7c]">{user?.email || "Workspace member"}</div></div><button onClick={() => setProfileOpen((v) => !v)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#706d7d] hover:bg-white" aria-label="Account menu"><ChevronDown size={15}/></button>
      </div>
    </div>
  </>;

  if (status === "loading" || status === "unauthenticated") return <div className="flex min-h-screen items-center justify-center"><div className="flex items-center gap-3"><BrandMark/><div><div className="text-sm font-bold">ProjectFlow</div><div className="text-xs text-[#6f6d7d]">Opening your workspace…</div></div></div></div>;

  return <div className="min-h-screen bg-[#f7f6fb]">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[246px] flex-col border-r border-[#eceaf3] bg-white md:flex">{sidebar}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 md:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-[#1b1735]/35 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)}/><aside className="absolute inset-y-0 left-0 flex w-[min(84vw,300px)] flex-col bg-white shadow-2xl">{sidebar}</aside></div>}
    <div className="min-h-screen md:pl-[246px]">
      <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-[#eceaf3] bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <button className="icon-btn h-9 w-9 md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={18}/></button>
        <form onSubmit={search} className="relative hidden w-full max-w-[380px] sm:block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#706d7d]"/><input className="h-10 w-full rounded-xl border border-[#efedf5] bg-[#faf9fd] pl-9 pr-14 text-[12px] outline-none transition focus:border-[#d3cdfb] focus:bg-white" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects..."/><span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-[#e9e6f1] bg-white px-1.5 py-1 text-[9px] font-[750] text-[#706d7d]">↵</span></form>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 rounded-xl bg-[#f5f3ff] px-3 py-2 text-[10px] font-[750] text-[#6b5cda] lg:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#6cc4a2]"/> Personal workspace</div>
          <div className="relative">
            <button className="icon-btn relative h-9 w-9" title="Notifications" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={notificationsOpen} onClick={() => { const next = !notificationsOpen; setNotificationsOpen(next); if (next) void loadNotifications(); }}>
              <Bell size={17}/>
              {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-white bg-[#dc4057] px-1 text-[9px] font-[850] leading-none text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
            </button>
            {notificationsOpen && <>
              <button className="fixed inset-0 z-40 cursor-default" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}/>
              <section className="absolute right-0 top-11 z-50 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-[#e9e6f2] bg-white shadow-[0_22px_70px_rgba(31,26,61,.18)]" aria-label="Notifications panel">
                <div className="flex items-center justify-between border-b border-[#efedf5] px-4 py-3.5"><div><h2 className="text-sm font-[800] text-[#28253d]">Notifications</h2><p className="mt-0.5 text-[11px] text-[#777489]">{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}</p></div><button onClick={() => void markAllNotificationsRead()} disabled={!unreadCount} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-[750] text-[#5546c8] hover:bg-[#f4f1ff] disabled:cursor-not-allowed disabled:text-[#9a97aa]" title="Mark all as read"><CheckCheck size={13}/> Mark all read</button></div>
                <div className="max-h-[min(65vh,440px)] overflow-y-auto">
                  {notificationLoading && notifications.length === 0 && <div className="px-5 py-10 text-center text-xs text-[#777489]">Loading notifications…</div>}
                  {!notificationLoading && notifications.length === 0 && <div className="px-6 py-10 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3f0ff] text-[#6557d8]"><Bell size={19}/></span><p className="mt-3 text-sm font-[750] text-[#333047]">Nothing new yet</p><p className="mx-auto mt-1 max-w-[250px] text-[11px] leading-5 text-[#777489]">Task updates, assignments, notes and project chat activity will show up here.</p></div>}
                  {notifications.map((notification) => {
                    const Icon = notification.type.startsWith("message") ? MessageCircle : notification.type.startsWith("note") ? FileText : notification.type.startsWith("member") ? UserPlus : notification.type.startsWith("project") ? FolderKanban : notification.type === "task_deleted" ? CircleCheck : ClipboardList;
                    const date = notification.createdAt ? new Date(notification.createdAt) : null;
                    const time = date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : "";
                    return <button key={notification._id} onClick={() => void openNotification(notification)} className={`flex w-full items-start gap-3 border-b border-[#f2f0f7] px-4 py-3.5 text-left transition-colors hover:bg-[#faf9ff] ${notification.readAt ? "bg-white" : "bg-[#f8f6ff]"}`}>
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notification.readAt ? "bg-[#f2f0f7] text-[#716d82]" : "bg-[#e9e5ff] text-[#5848cb]"}`}><Icon size={16}/></span>
                      <span className="min-w-0 flex-1"><span className="flex items-start gap-2"><span className="flex-1 text-[12px] font-[800] leading-5 text-[#302d46]">{notification.title}</span>{!notification.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#6557e8]"/>}</span>{notification.body && <span className="mt-0.5 block line-clamp-2 text-[11px] leading-5 text-[#69667d]">{notification.body}</span>}<span className="mt-1.5 block text-[10px] text-[#858196]">{time}</span></span>
                    </button>;
                  })}
                </div>
                <div className="border-t border-[#efedf5] p-2"><Link href="/notifications" onClick={() => setNotificationsOpen(false)} className="flex items-center justify-center rounded-xl px-3 py-2.5 text-[11px] font-[800] text-[#5546c8] hover:bg-[#f4f1ff]">View all notifications</Link></div>
              </section>
            </>}
          </div>
          <button className="icon-btn h-9 w-9" title="Shortcuts" onClick={() => router.push("/projects")}><Command size={16}/></button>
          <button className="icon-btn relative h-9 w-9" title="Help & guidance" onClick={() => window.open("https://github.com/abhishek-kr01/projectmgmt-backend", "_blank", "noopener,noreferrer")}><CircleHelp size={16}/></button>
          <div className="mx-1 hidden h-7 w-px bg-[#eceaf3] sm:block"/>
          <div className="relative flex items-center gap-2"><span className="relative inline-flex"><Avatar name={displayName} size="xs"/><span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#36b37e]" title="You are online" aria-label="You are online"/></span><span className="hidden max-w-[120px] truncate text-[11px] font-[700] text-[#514e65] lg:block">{firstName}</span><button className="flex h-7 w-5 items-center justify-center text-[#706d7c]" onClick={() => setProfileOpen((v) => !v)} aria-label="Open account menu"><ChevronDown size={14}/></button>{profileOpen && <div className="absolute right-0 top-10 z-50 w-52 rounded-2xl border border-[#eceaf3] bg-white p-2 shadow-xl"><div className="border-b border-[#f0eef6] px-3 py-2.5"><div className="truncate text-xs font-bold">{displayName}</div><div className="mt-1 truncate text-[10px] text-[#706d7d]">{user?.email}</div></div><Link className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-[#6b687e] hover:bg-[#f8f7fc]" href="/settings" onClick={() => setProfileOpen(false)}><Settings2 size={14}/> Account settings</Link><button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-[#b84b5c] hover:bg-[#fff3f4]"><LogOut size={14}/> Sign out</button></div>}</div>
        </div>
      </header>
      <main className="mx-auto min-h-[calc(100vh-68px)] w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">{children}<footer className="mt-12 flex flex-col gap-2 border-t border-[#eae8f1] py-5 text-[10px] text-[#706e79] sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} ProjectFlow · Make good work feel lighter.</span><span className="flex items-center gap-4"><Link href="/settings" className="hover:text-[#5b49ce]">Settings</Link><span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#51bd92]"/> Private workspace</span></span></footer>
      </main>
    </div>
  </div>;
}
