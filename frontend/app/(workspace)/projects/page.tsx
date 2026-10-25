"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, FolderKanban, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { EmptyState, ErrorMessage, LoadingBlock, Modal, PageHeading, Toast, type ToastMessage } from "@/components/ui";

const palette = [
  { bg: "#eeeaff", fg: "#6554d8", bar: "#7869e8" }, { bg: "#e4f7ee", fg: "#2f916d", bar: "#4eb18b" }, { bg: "#fff1df", fg: "#b47a26", bar: "#e5ab53" }, { bg: "#e7f0ff", fg: "#4d7ec4", bar: "#76a0e7" }, { bg: "#ffeaf0", fg: "#bc5b78", bar: "#df8da4" }, { bg: "#f3eaff", fg: "#8c5bc6", bar: "#ab84d8" },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false); const [editing, setEditing] = useState<Project | null>(null); const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [busy, setBusy] = useState(false); const [formError, setFormError] = useState(""); const [toast, setToast] = useState<ToastMessage>(null); const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const load = useCallback(async () => { setLoading(true); setError(""); try { setProjects(await api.projects.list()); } catch (err) { setError(err instanceof Error ? err.message : "Could not load projects."); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const term = new URLSearchParams(window.location.search).get("search"); if (term) setSearch(term); }, []);

  const filtered = useMemo(() => { const term = search.trim().toLowerCase(); return projects.filter((project) => !term || `${project.name} ${project.description || ""}`.toLowerCase().includes(term)); }, [projects, search]);
  const openCreate = () => { setEditing(null); setName(""); setDescription(""); setFormError(""); setModalOpen(true); };
  const openEdit = (project: Project) => { setEditing(project); setName(project.name); setDescription(project.description || ""); setFormError(""); setModalOpen(true); };

  async function saveProject(event: React.FormEvent) {
    event.preventDefault(); if (!name.trim()) { setFormError("Give your project a name."); return; }
    setBusy(true); setFormError("");
    try {
      if (editing) { const updated = await api.projects.update(editing._id, { name: name.trim(), description: description.trim() }); setProjects((current) => current.map((p) => p._id === editing._id ? { ...p, ...updated } : p)); setToast({ type: "success", message: "Project updated." }); setModalOpen(false); }
      else { const created = await api.projects.create({ name: name.trim(), description: description.trim() }); setProjects((current) => [created, ...current.filter((p) => p._id !== created._id)]); setModalOpen(false); router.push(`/projects/${created._id}`); }
    } catch (err) { setFormError(err instanceof Error ? err.message : "Could not save this project."); }
    finally { setBusy(false); }
  }

  async function deleteProject() {
    if (!deleteTarget) return; setBusy(true);
    try { await api.projects.remove(deleteTarget._id); setProjects((current) => current.filter((p) => p._id !== deleteTarget._id)); setToast({ type: "success", message: "Project deleted." }); setDeleteTarget(null); }
    catch (err) { setToast({ type: "error", message: err instanceof Error ? err.message : "Could not delete this project." }); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeading eyebrow="Workspace / Projects" title="All projects" description="A home for every initiative, plan, and thing your team is building." action={<button className="btn btn-primary" onClick={openCreate}><Plus size={16}/> New project</button>}/>
    <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3"><div className="panel flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#f0edff] text-[#6b5bdf]"><FolderKanban size={18}/></div><div><div className="text-[23px] font-[800] tracking-[-.05em]">{loading ? "—" : projects.length}</div><div className="mt-0.5 text-[10px] text-[#9692a7]">Projects in workspace</div></div></div><div className="panel flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#e9f8f1] text-[#269773]"><CheckCircle2 size={18}/></div><div><div className="text-[23px] font-[800] tracking-[-.05em]">{loading ? "—" : projects.filter((p) => p.myRole === "admin" || p.role === "admin").length}</div><div className="mt-0.5 text-[10px] text-[#9692a7]">Projects you administer</div></div></div><div className="panel col-span-2 flex items-center gap-3 p-4 lg:col-span-1"><div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#fff3e0] text-[#b77b25]"><Users size={18}/></div><div><div className="text-[23px] font-[800] tracking-[-.05em]">{loading ? "—" : projects.reduce((sum, p) => sum + (p.members || 0), 0)}</div><div className="mt-0.5 text-[10px] text-[#9692a7]">Project member seats</div></div></div></section>

    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-[15px] font-[800] tracking-[-.025em]">Your spaces <span className="ml-1 text-[11px] font-[600] text-[#a09db0]">{loading ? "" : filtered.length}</span></h2><p className="mt-1 text-[11px] text-[#9692a7]">Open a project to see tasks, members, and notes.</p></div><div className="field-wrap w-full sm:max-w-[270px]"><Search size={15} className="field-icon"/><input className="field field-with-icon h-[39px]" placeholder="Filter projects..." value={search} onChange={(e) => setSearch(e.target.value)}/>{search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a09db0]" aria-label="Clear search"><X size={14}/></button>}</div></div>
    {error && <div className="mb-5"><ErrorMessage>{error}</ErrorMessage></div>}
    {loading ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"><div className="panel p-5"><LoadingBlock rows={2}/></div><div className="panel p-5"><LoadingBlock rows={2}/></div><div className="panel p-5"><LoadingBlock rows={2}/></div></div> : filtered.length === 0 ? <div className="panel">{projects.length === 0 ? <EmptyState icon={<FolderKanban size={23}/>} title="This space is ready for your first project" description="Create a project, add a short description, and begin turning work into clear next steps." action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15}/> Create a project</button>}/> : <EmptyState icon={<Search size={23}/>} title="No projects match that search" description="Try a different name or clear the search to see all projects." action={<button className="btn btn-outline" onClick={() => setSearch("")}>Clear search</button>}/>}</div> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((project, index) => { const tone = palette[index % palette.length]; return <article key={project._id} className="panel group relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#dad4fb] hover:shadow-[0_12px_30px_rgba(69,53,160,.07)]"><div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full" style={{ background: tone.bg }}/><div className="relative flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-[14px] text-[15px] font-[850]" style={{ background: tone.bg, color: tone.fg }}>{project.name?.slice(0, 1).toUpperCase()}</div>{(project.myRole === "admin" || project.role === "admin") && <div className="flex items-center gap-1"><button className="icon-btn h-8 w-8 border-transparent bg-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Edit project" onClick={() => openEdit(project)}><Pencil size={14}/></button><button className="icon-btn h-8 w-8 border-transparent bg-transparent text-[#b8a0a8] opacity-100 hover:text-[#bc4d63] sm:opacity-0 sm:group-hover:opacity-100" title="Delete project" onClick={() => setDeleteTarget(project)}><Trash2 size={14}/></button></div>}</div><Link href={`/projects/${project._id}`}><h3 className="mt-4 truncate text-[15px] font-[800] tracking-[-.02em] text-[#302d46] group-hover:text-[#6151d9]">{project.name}</h3><p className="mt-1.5 line-clamp-2 min-h-[36px] text-[11px] leading-[1.65] text-[#9692a7]">{project.description || "A shared space for planning, delivery, and collaboration."}</p></Link><div className="mt-5 flex items-center justify-between border-t border-[#f0eef6] pt-4"><div className="flex items-center gap-2 text-[10px] text-[#9692a7]"><Users size={13}/>{typeof project.members === "number" ? `${project.members} members` : "Team workspace"}</div><span className="inline-flex items-center gap-1 text-[10px] font-[750] text-[#77738e]">Open project <ArrowRight size={12} className="transition group-hover:translate-x-0.5"/></span></div></article>; })}</div>}

    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit project details" : "Create a new project"} description={editing ? "Keep the purpose and name up to date." : "Start with a name. You can organize the details as you go."}>
      <form className="space-y-4" onSubmit={saveProject}>{formError && <ErrorMessage>{formError}</ErrorMessage>}<div><label className="field-label" htmlFor="project-name">Project name</label><input id="project-name" autoFocus required maxLength={100} className="field" placeholder="e.g. Website refresh" value={name} onChange={(e) => setName(e.target.value)}/></div><div><label className="field-label" htmlFor="project-description">Description <span className="font-normal text-[#a09db0]">(optional)</span></label><textarea id="project-description" className="field" maxLength={1000} placeholder="What are you working toward?" value={description} onChange={(e) => setDescription(e.target.value)}/><div className="mt-1 text-right text-[10px] text-[#aaa7b8]">{description.length}/1000</div></div><div className="flex justify-end gap-2 pt-2"><button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create project"}<ArrowRight size={14}/></button></div></form>
    </Modal>
    <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete this project?" description="This action cannot be undone."><div className="rounded-xl border border-[#f3dce0] bg-[#fff7f8] p-4 text-[12px] leading-5 text-[#a24759]">You’re about to delete <strong>{deleteTarget?.name}</strong>, including its tasks, subtasks, notes, and memberships. This cannot be undone.</div><div className="mt-5 flex justify-end gap-2"><button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Keep project</button><button className="btn btn-danger" disabled={busy} onClick={deleteProject}><Trash2 size={14}/>{busy ? "Deleting…" : "Delete project"}</button></div></Modal>
    <Toast value={toast} onDismiss={() => setToast(null)}/>
  </>;
}
