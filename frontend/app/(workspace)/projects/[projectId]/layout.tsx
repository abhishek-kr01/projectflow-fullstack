"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CheckSquare, FileText, LayoutDashboard, Users, MessageCircle } from "lucide-react";
import { API_BASE_URL, api } from "@/lib/api";
import type { Project, ProjectMember, ProjectPresence } from "@/lib/types";
import { Avatar, ErrorMessage } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ projectId: string }>(); const pathname = usePathname(); const router = useRouter(); const { user } = useAuth();
  const projectId = params.projectId;
  const [project, setProject] = useState<Project | null>(null); const [members, setMembers] = useState<ProjectMember[]>([]); const [presenceByUser, setPresenceByUser] = useState<Record<string, ProjectPresence>>({}); const [loading, setLoading] = useState(true); const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [nextProject, nextMembers] = await Promise.all([api.projects.get(projectId), api.projects.members(projectId).catch(() => [])]);
      setProject(nextProject); setMembers(nextMembers);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load this project."); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!user?._id || !projectId) return;
    let alive = true;
    let source: EventSource | null = null;
    const loadPresence = async () => {
      try {
        const current = await api.realtime.projectPresence(projectId);
        if (!alive) return;
        setPresenceByUser(Object.fromEntries(current.map((item) => [item.userId, item])));
      } catch { /* Presence is supplemental; keep the project usable if this request fails. */ }
    };
    void loadPresence();
    const interval = window.setInterval(() => { void loadPresence(); }, 20_000);
    const connect = () => {
      source?.close();
      const token = window.localStorage.getItem("projectflow_access_token");
      if (!token) return;
      const nextSource = new EventSource(`${API_BASE_URL}/realtime/${projectId}/events?token=${encodeURIComponent(token)}`);
      source = nextSource;
      nextSource.addEventListener("presence:changed", (event) => {
        try {
          const envelope = JSON.parse((event as MessageEvent).data);
          const next = envelope?.payload as ProjectPresence;
          if (!next?.userId) return;
          setPresenceByUser((current) => ({ ...current, [next.userId]: { ...current[next.userId], ...next } }));
        } catch { /* Ignore malformed presence events. */ }
      });
      nextSource.addEventListener("message:created", (event) => {
        try {
          const envelope = JSON.parse((event as MessageEvent).data);
          const message = envelope?.payload;
          const authorId = String(message?.author?._id || message?.author || "");
          if (!message?._id || message.task || authorId === String(user._id)) return;
          const chatIsVisible = pathname === `/projects/${projectId}/chat` && document.visibilityState === "visible";
          void api.messages.markReceipts(projectId, [String(message._id)], chatIsVisible ? "read" : "delivered").catch(() => undefined);
        } catch { /* Ignore malformed message events. */ }
      });
    };
    connect();
    window.addEventListener("projectflow:token-refreshed", connect);
    return () => { alive = false; window.clearInterval(interval); window.removeEventListener("projectflow:token-refreshed", connect); source?.close(); };
  }, [projectId, user?._id, pathname]);

  const myRole = members.find((member) => member.user?._id === user?._id)?.role;
  const tabs = [{ label: "Overview", href: `/projects/${projectId}`, icon: LayoutDashboard }, { label: "Tasks", href: `/projects/${projectId}/tasks`, icon: CheckSquare }, { label: "Members", href: `/projects/${projectId}/members`, icon: Users }, { label: "Notes", href: `/projects/${projectId}/notes`, icon: FileText }, { label: "Chat", href: `/projects/${projectId}/chat`, icon: MessageCircle }];

  return <>
    <div className="mb-6">
      <button className="mb-5 inline-flex items-center gap-1.5 text-[10px] font-[750] text-[#706d7d] transition hover:text-[#5b49ce]" onClick={() => router.push("/projects")}><ArrowLeft size={13}/> All projects</button>
      {loading ? <div className="panel flex items-center gap-4 p-5"><div className="skeleton h-12 w-12 rounded-[15px]"/><div className="flex-1 space-y-2"><div className="skeleton h-4 w-1/3"/><div className="skeleton h-3 w-2/3"/></div></div> : error ? <div className="panel p-5"><ErrorMessage>{error}</ErrorMessage><button className="btn btn-outline mt-4" onClick={() => void load()}>Try again</button></div> : project && <div className="panel relative overflow-hidden p-5 sm:p-6"><div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-[#f2efff]"/><div className="absolute -right-1 -top-7 h-24 w-24 rounded-full border-[14px] border-white/60"/><div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex min-w-0 items-start gap-4"><div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[15px] bg-[#eeeaff] text-[18px] font-[850] text-[#6554d8]">{project.name?.slice(0, 1).toUpperCase() || "P"}</div><div className="min-w-0"><div className="mb-1.5 flex flex-wrap items-center gap-2"><span className="eyebrow">Project workspace</span>{myRole && <span className={`pill ${myRole === "admin" ? "pill-violet" : myRole === "project_admin" ? "pill-blue" : "pill-gray"}`}>{myRole.replace("_", " ")}</span>}</div><h1 className="break-words text-[21px] font-[800] tracking-[-.045em] sm:text-[25px]">{project.name}</h1><p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-[#6f6d7d]">{project.description || "Keep the plan, conversations, and next steps for this project in one place."}</p></div></div><div className="flex items-center gap-2"><div className="flex items-center gap-2"><div className="avatar-stack">{members.slice(0, 4).map((member, i) => { const memberId = member.user?._id; const online = Boolean(memberId && presenceByUser[memberId]?.online); return <span key={memberId || i} className="relative inline-flex" title={`${member.user?.fullName || member.user?.username || "Member"} · ${online ? "Online" : "Offline"}`}><Avatar name={member.user?.fullName || member.user?.username} src={member.user?.avatar?.url} size="xs"/>{online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#36b37e]"/>}</span>; })}{members.length > 4 && <span className="avatar avatar-xs border-2 border-white bg-[#f1eff8] text-[9px] text-[#68627b]">+{members.length - 4}</span>}</div><span className="hidden text-[10px] font-[750] text-[#3b8468] sm:inline">{Object.values(presenceByUser).filter((item) => item.online).length} online</span></div><Link className="btn btn-outline btn-sm" href={`/projects/${projectId}/members`}><Users size={13}/> Team <ArrowUpRight size={12}/></Link></div></div>
      </div>}
      <div className="mt-5 flex items-center gap-1 overflow-x-auto border-b border-[#e9e7f0] pb-0.5">{tabs.map((tab) => { const active = tab.href === `/projects/${projectId}` ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`); const Icon = tab.icon; return <Link key={tab.href} href={tab.href} className={`relative flex shrink-0 items-center gap-2 px-3.5 py-3 text-[11px] font-[750] transition ${active ? "text-[#5f50d6]" : "text-[#706d7d] hover:text-[#4b4760]"}`}><Icon size={14}/>{tab.label}{active && <span className="absolute inset-x-3 bottom-[-2px] h-[2px] rounded-full bg-[#6a5ae2]"/>}</Link>; })}</div>
    </div>
    {children}
  </>;
}
