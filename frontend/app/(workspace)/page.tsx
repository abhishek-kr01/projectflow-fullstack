"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, CalendarDays, Check, CheckCircle2, CircleAlert, Clock3, FolderKanban, Plus, Sparkles, Target } from "lucide-react";
import { api, normalizeStatus } from "@/lib/api";
import type { Project, Task } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { EmptyState, LoadingBlock, Toast, type ToastMessage } from "@/components/ui";

function formatDate(date?: string) { if (!date) return "Recently"; const value = new Date(date); return Number.isNaN(value.getTime()) ? "Recently" : value.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<(Task & { projectName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [toast, setToast] = useState<ToastMessage>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true); setApiError("");
    try {
      const nextProjects = await api.projects.list();
      setProjects(nextProjects);
      const taskGroups = await Promise.allSettled(nextProjects.map(async (project) => ({ project, tasks: await api.tasks.list(project._id) })));
      const allTasks = taskGroups.flatMap((group) => group.status === "fulfilled" ? group.value.tasks.map((task) => ({ ...task, projectName: group.value.project.name })) : []);
      setTasks(allTasks.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()));
      const failed = taskGroups.some((group) => group.status === "rejected");
      if (failed) setApiError("Some task lists could not be loaded. Check your project permissions or backend logs.");
    } catch (error) {
      setProjects([]); setTasks([]); setApiError(error instanceof Error ? error.message : "Could not load workspace data.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  const completed = useMemo(() => tasks.filter((task) => normalizeStatus(task.status) === "done").length, [tasks]);
  const inProgress = useMemo(() => tasks.filter((task) => normalizeStatus(task.status) === "in_progress").length, [tasks]);
  const todo = useMemo(() => tasks.filter((task) => normalizeStatus(task.status) === "todo").length, [tasks]);
  const displayName = user?.fullName?.trim() || user?.username || "there";
  const firstName = displayName.split(/\s+/)[0];
  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return <>
    <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-[700] text-[#9a96ac]"><CalendarDays size={13}/>{dateLabel}</div><h1 className="text-[27px] font-[800] tracking-[-.05em] sm:text-[31px]">Good day, {firstName} <span className="inline-block origin-bottom-right animate-[wave_1.5s_ease-in-out_1]">✦</span></h1><p className="mt-1.5 text-[13px] text-[#89869b]">A little clarity goes a long way. Here’s your workspace at a glance.</p></div><div className="flex items-center gap-2"><button className="btn btn-outline" onClick={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)); }} disabled={loading || refreshing}><Activity size={15}/>{refreshing ? "Refreshing" : "Refresh"}</button><Link className="btn btn-primary" href="/projects"><Plus size={16}/> New project</Link></div></div>

    <section className="gradient-card relative mb-6 overflow-hidden rounded-[22px] px-5 py-6 text-white shadow-[0_12px_28px_rgba(83,69,202,.14)] sm:px-7 sm:py-7">
      <div className="absolute -right-16 -top-28 h-[300px] w-[300px] rounded-full border border-white/10"/><div className="absolute -right-2 -top-16 h-[210px] w-[210px] rounded-full border border-white/10"/><div className="absolute bottom-[-120px] right-[18%] h-[230px] w-[230px] rounded-full bg-[#a9a1ff]/10 blur-3xl"/>
      <div className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div className="max-w-[570px]"><div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-[800] uppercase tracking-[.13em] text-[#d6d1ff]"><Sparkles size={11}/> Your work, in good shape</div><h2 className="text-[21px] font-[780] leading-[1.2] tracking-[-.04em] sm:text-[24px]">Turn your plans into progress.</h2><p className="mt-2 max-w-[440px] text-[12px] leading-5 text-white/65">Give every project a home, every task a next step, and your team a clearer view of what’s ahead.</p></div><Link href="/projects" className="btn w-fit bg-white text-[#5143cb] hover:bg-[#f1efff]"><Plus size={15}/> Create a project <ArrowRight size={14}/></Link></div>
      <div className="relative z-10 mt-6 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/15 pt-4 text-[10px] text-white/65"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#9be4c9]"/> Keep the next step visible</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#d7d0ff]"/> Share context with your team</span></div>
    </section>

    {apiError && <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#f1dfe1] bg-[#fff9f9] p-4"><CircleAlert size={17} className="mt-0.5 shrink-0 text-[#bd5264]"/><div className="min-w-0"><div className="text-[12px] font-[750] text-[#7e3543]">Workspace data needs attention</div><p className="mt-1 text-[11px] leading-5 text-[#a0646f]">{apiError}</p><p className="mt-1 text-[10px] leading-5 text-[#a0646f]">If projects exist but this view is empty, see the backend integration notes in the project README.</p></div></div>}

    <section className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
      {[{ label: "Total projects", value: projects.length, detail: "Across your workspace", icon: FolderKanban, tone: "violet", badge: "Workspace" }, { label: "Open tasks", value: todo + inProgress, detail: `${todo} waiting to start`, icon: Target, tone: "blue", badge: "In motion" }, { label: "In progress", value: inProgress, detail: "Moving forward now", icon: Clock3, tone: "amber", badge: "Active" }, { label: "Completed", value: completed, detail: tasks.length ? `${Math.round((completed / tasks.length) * 100)}% of all tasks` : "A fresh start", icon: CheckCircle2, tone: "green", badge: "Done" }].map((stat) => {
        const Icon = stat.icon; const tone = stat.tone === "violet" ? "bg-[#f0edff] text-[#6e5de4]" : stat.tone === "blue" ? "bg-[#ebf2ff] text-[#4c7ed3]" : stat.tone === "amber" ? "bg-[#fff3e0] text-[#bb812b]" : "bg-[#e9f8f1] text-[#279773]";
        return <div key={stat.label} className="panel p-4 sm:p-5"><div className="flex items-start justify-between gap-2"><div className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${tone}`}><Icon size={17}/></div><span className="hidden rounded-lg bg-[#faf9fd] px-2 py-1 text-[9px] font-[750] text-[#a09db1] sm:inline-flex">{stat.badge}</span></div><div className="mt-4 text-[26px] font-[800] tracking-[-.06em] text-[#2c2942]">{loading ? <span className="skeleton inline-block h-7 w-10 align-middle"/> : stat.value}</div><div className="mt-1 text-[11px] font-[750] text-[#4e4a63]">{stat.label}</div><div className="mt-1 text-[10px] text-[#9693a7]">{stat.detail}</div></div>;
      })}
    </section>

    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <div className="panel overflow-hidden"><div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6"><div><div className="panel-title">Your projects</div><div className="mt-1 text-[11px] text-[#9290a4]">The spaces where your work happens.</div></div><Link href="/projects" className="inline-flex items-center gap-1.5 text-[11px] font-[750] text-[#6557e8] hover:text-[#4f42c6]">View all <ArrowRight size={13}/></Link></div><div className="divider"/>
        {loading ? <div className="space-y-3 p-5"><LoadingBlock rows={2}/></div> : projects.length === 0 ? <EmptyState icon={<FolderKanban size={23}/>} title="Your first project starts here" description="Create a project to gather tasks, teammates, and notes in one organized place." action={<Link href="/projects" className="btn btn-primary"><Plus size={14}/> Create your first project</Link>}/> : <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">{projects.slice(0, 4).map((project, index) => {
          const projectTasks = tasks.filter((task) => (typeof task.project === "string" ? task.project : task.project?._id) === project._id);
          const finished = projectTasks.filter((task) => normalizeStatus(task.status) === "done").length;
          const percent = projectTasks.length ? Math.round((finished / projectTasks.length) * 100) : 0;
          const colors = [{ bg: "#eeeaff", color: "#6654d8" }, { bg: "#e4f7ee", color: "#2e936d" }, { bg: "#fff1df", color: "#b47a26" }, { bg: "#e8f0ff", color: "#4d7ec4" }]; const color = colors[index % colors.length];
          return <Link key={project._id} href={`/projects/${project._id}`} className="group rounded-[15px] border border-[#efedf5] p-4 transition hover:-translate-y-0.5 hover:border-[#d7d1fb] hover:shadow-[0_8px_20px_rgba(69,53,160,.06)]"><div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-[13px] text-sm font-[850]" style={{ background: color.bg, color: color.color }}>{project.name?.slice(0, 1).toUpperCase()}</div><span className="rounded-lg bg-[#f7f6fb] px-2 py-1 text-[9px] font-[700] text-[#8f8aa4]">{projectTasks.length} tasks</span></div><h3 className="mt-4 truncate text-[13px] font-[800] text-[#302d46] group-hover:text-[#5e50d6]">{project.name}</h3><p className="mt-1 line-clamp-2 min-h-[34px] text-[10px] leading-[1.6] text-[#9996aa]">{project.description || "No description yet. Open the project to add context and get things moving."}</p><div className="mt-4"><div className="mb-1.5 flex items-center justify-between text-[9px]"><span className="font-[700] text-[#8f8ba2]">Completion</span><span className="font-[800] text-[#5e5a73]">{percent}%</span></div><div className="h-[5px] overflow-hidden rounded-full bg-[#f0eef6]"><div className="h-full rounded-full bg-[#7869e8] transition-all" style={{ width: `${percent}%` }}/></div></div></Link>;
        })}</div>}
      </div>

      <div className="panel overflow-hidden"><div className="flex items-center justify-between px-5 py-5 sm:px-6"><div><div className="panel-title">Recent tasks</div><div className="mt-1 text-[11px] text-[#9290a4]">A quick look at what’s moving.</div></div><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f0edff] text-[#6b5bdf]"><CheckSquareIcon/></span></div><div className="divider"/>
        {loading ? <div className="p-5"><LoadingBlock rows={3}/></div> : tasks.length === 0 ? <EmptyState icon={<CheckCircle2 size={22}/>} title="No tasks on the board yet" description="Once a project has tasks, you’ll see your latest work here." action={projects.length ? <Link href={`/projects/${projects[0]._id}/tasks`} className="btn btn-outline">Open tasks <ArrowRight size={14}/></Link> : undefined}/> : <div className="divide-y divide-[#f0eef6]">{tasks.slice(0, 5).map((task) => { const status = normalizeStatus(task.status); return <Link key={task._id} href={`/projects/${typeof task.project === "string" ? task.project : task.project._id}/tasks`} className="flex items-start gap-3 px-5 py-4 transition hover:bg-[#fcfbff] sm:px-6"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] ${status === "done" ? "bg-[#e8f8f0] text-[#269771]" : status === "in_progress" ? "bg-[#fff3e0] text-[#b77b25]" : "bg-[#f0edff] text-[#6b5bdf]"}`}>{status === "done" ? <Check size={14}/> : status === "in_progress" ? <Clock3 size={14}/> : <Target size={14}/>}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-[750] text-[#3b384f]">{task.title}</span><span className="mt-1 block truncate text-[10px] text-[#a09db0]">{task.projectName || "Project"} · Updated {formatDate(task.updatedAt || task.createdAt)}</span></span><span className={`pill ${status === "done" ? "pill-green" : status === "in_progress" ? "pill-amber" : "pill-gray"}`}>{status === "in_progress" ? "In progress" : status === "done" ? "Done" : "To do"}</span></Link>; })}</div>}
      </div>
    </section>
    <Toast value={toast} onDismiss={() => setToast(null)}/>
  </>;
}

function CheckSquareIcon() { return <CheckCircle2 size={16}/>; }
