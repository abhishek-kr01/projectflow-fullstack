"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Project } from "@/lib/types";
import { Avatar, BrandMark } from "@/components/ui";
import { ChevronDown, ChevronLeft, CircleHelp, Command, FolderKanban, LayoutDashboard, LogOut, Menu, Plus, Search, Settings2, Sparkles, X, CheckSquare } from "lucide-react";

const mainNav = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
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

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/projects?search=${encodeURIComponent(value)}` : "/projects");
  };

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const displayName = user?.fullName?.trim() || user?.username || "there";
  const firstName = displayName.split(/\s+/)[0];

  const sidebar = <>
    <div className="flex h-[76px] items-center gap-3 px-6">
      <BrandMark size="md" />
      <div className="min-w-0"><div className="text-[17px] font-[850] tracking-[-.055em]">project<span className="text-[#6557e8]">flow</span></div><div className="mt-0.5 text-[9px] font-[750] uppercase tracking-[.16em] text-[#a2a0b3]">Your team's space</div></div>
      <button className="icon-btn ml-auto h-8 w-8 border-transparent md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={17}/></button>
    </div>
    <div className="px-4 pt-5">
      <div className="mb-2 px-3 text-[9px] font-[850] uppercase tracking-[.15em] text-[#aaa7ba]">Workspace</div>
      <nav className="space-y-1">
        {mainNav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-[650] transition-colors ${active ? "bg-[#f0eeff] text-[#5b4cda]" : "text-[#77758c] hover:bg-[#f8f7fc] hover:text-[#302d46]"}`}>
            <Icon size={17} strokeWidth={active ? 2.3 : 1.9} /><span className="flex-1">{item.label}</span>{item.label === "My tasks" && <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[9px] font-[800] text-[#8c87a7]">↗</span>}
          </Link>;
        })}
      </nav>
    </div>
    <div className="px-4 pt-8">
      <div className="mb-2 flex items-center justify-between px-3"><div className="text-[9px] font-[850] uppercase tracking-[.15em] text-[#aaa7ba]">Your projects</div><button className="flex h-6 w-6 items-center justify-center rounded-md text-[#9692ab] hover:bg-[#f0eeff] hover:text-[#5b4cda]" onClick={() => router.push("/projects")} aria-label="Create a project"><Plus size={15}/></button></div>
      <nav className="space-y-1">
        {projectLoading && <div className="space-y-2 px-3 py-2"><div className="skeleton h-3 w-4/5"/><div className="skeleton h-3 w-3/5"/><div className="skeleton h-3 w-2/3"/></div>}
        {!projectLoading && projects.slice(0, 6).map((project, index) => {
          const active = pathname.includes(`/projects/${project._id}`);
          const colors = ["#eae6ff", "#e1f5ed", "#fff0dc", "#e6efff", "#ffe6ec", "#f0e7ff"];
          const textColors = ["#6a58d8", "#268565", "#b77a26", "#4e7ac3", "#bd6079", "#8b61c8"];
          return <Link key={project._id} href={`/projects/${project._id}`} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] transition-colors ${active ? "bg-[#f0eeff] text-[#5b4cda]" : "text-[#77758c] hover:bg-[#f8f7fc] hover:text-[#302d46]"}`}><span className="flex h-6 w-6 items-center justify-center rounded-[8px] text-[10px] font-[850]" style={{ background: colors[index % colors.length], color: textColors[index % textColors.length] }}>{project.name?.trim()?.slice(0, 1).toUpperCase() || "P"}</span><span className="min-w-0 flex-1 truncate font-[650]">{project.name}</span><ChevronLeft size={12} className="rotate-180 opacity-0 transition-opacity group-hover:opacity-50"/></Link>;
        })}
        {!projectLoading && projects.length === 0 && <div className="px-3 py-2 text-[11px] leading-5 text-[#a19eb2]">Projects you create or join will show up here.</div>}
      </nav>
      <Link href="/projects" className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-[650] text-[#928fa4] hover:bg-[#f8f7fc] hover:text-[#6557e8]"><Plus size={14}/> Browse all projects</Link>
    </div>
    <div className="mt-auto p-4">
      <div className="relative overflow-hidden rounded-[17px] bg-[#f4f1ff] p-4">
        <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full border-[14px] border-white/50"/><div className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-[#6b5be2] shadow-sm"><Sparkles size={16}/></div>
        <div className="relative mt-3 text-[12px] font-[800] text-[#393456]">A little more focus.</div><div className="relative mt-1 text-[10px] leading-4 text-[#8983b3]">One clear plan makes a big difference.</div>
      </div>
      <div className="mt-4 flex items-center gap-2.5 rounded-xl px-2 py-2">
        <Avatar name={displayName} src={typeof user?.avatar === "object" ? user?.avatar?.url : undefined}/><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-[750] text-[#3b384f]">{displayName}</div><div className="truncate text-[10px] text-[#9996aa]">{user?.email || "Workspace member"}</div></div><button onClick={() => setProfileOpen((v) => !v)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9693a8] hover:bg-white" aria-label="Account menu"><ChevronDown size={15}/></button>
      </div>
    </div>
  </>;

  if (status === "loading" || status === "unauthenticated") return <div className="flex min-h-screen items-center justify-center"><div className="flex items-center gap-3"><BrandMark/><div><div className="text-sm font-bold">ProjectFlow</div><div className="text-xs text-[#9290a5]">Opening your workspace…</div></div></div></div>;

  return <div className="min-h-screen bg-[#f7f6fb]">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[246px] flex-col border-r border-[#eceaf3] bg-white md:flex">{sidebar}</aside>
    {mobileOpen && <div className="fixed inset-0 z-50 md:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-[#1b1735]/35 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)}/><aside className="absolute inset-y-0 left-0 flex w-[min(84vw,300px)] flex-col bg-white shadow-2xl">{sidebar}</aside></div>}
    <div className="min-h-screen md:pl-[246px]">
      <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-[#eceaf3] bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <button className="icon-btn h-9 w-9 md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={18}/></button>
        <form onSubmit={search} className="relative hidden w-full max-w-[380px] sm:block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a09db3]"/><input className="h-10 w-full rounded-xl border border-[#efedf5] bg-[#faf9fd] pl-9 pr-14 text-[12px] outline-none transition focus:border-[#d3cdfb] focus:bg-white" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects..."/><span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-[#e9e6f1] bg-white px-1.5 py-1 text-[9px] font-[750] text-[#a09db3]">↵</span></form>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 rounded-xl bg-[#f5f3ff] px-3 py-2 text-[10px] font-[750] text-[#6b5cda] lg:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#6cc4a2]"/> Personal workspace</div>
          <button className="icon-btn h-9 w-9" title="Shortcuts" onClick={() => router.push("/projects")}><Command size={16}/></button>
          <button className="icon-btn relative h-9 w-9" title="Help & guidance" onClick={() => window.open("https://github.com/abhishek-kr01/projectmgmt-backend", "_blank", "noopener,noreferrer")}><CircleHelp size={16}/></button>
          <div className="mx-1 hidden h-7 w-px bg-[#eceaf3] sm:block"/>
          <div className="relative flex items-center gap-2"><Avatar name={displayName} size="xs"/><span className="hidden max-w-[120px] truncate text-[11px] font-[700] text-[#514e65] lg:block">{firstName}</span><button className="flex h-7 w-5 items-center justify-center text-[#9895a9]" onClick={() => setProfileOpen((v) => !v)} aria-label="Open account menu"><ChevronDown size={14}/></button>{profileOpen && <div className="absolute right-0 top-10 z-50 w-52 rounded-2xl border border-[#eceaf3] bg-white p-2 shadow-xl"><div className="border-b border-[#f0eef6] px-3 py-2.5"><div className="truncate text-xs font-bold">{displayName}</div><div className="mt-1 truncate text-[10px] text-[#9592a7]">{user?.email}</div></div><Link className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-[#6b687e] hover:bg-[#f8f7fc]" href="/settings" onClick={() => setProfileOpen(false)}><Settings2 size={14}/> Account settings</Link><button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-[#b94b5c] hover:bg-[#fff3f4]"><LogOut size={14}/> Sign out</button></div>}</div>
        </div>
      </header>
      <main className="mx-auto min-h-[calc(100vh-68px)] w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">{children}<footer className="mt-12 flex flex-col gap-2 border-t border-[#eae8f1] py-5 text-[10px] text-[#aaa7b8] sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} ProjectFlow · Make good work feel lighter.</span><span className="flex items-center gap-4"><Link href="/settings" className="hover:text-[#6557e8]">Settings</Link><span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#51bd92]"/> Private workspace</span></span></footer>
      </main>
    </div>
  </div>;
}
