"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, Check, CheckCircle2, Circle, Clock3, ClipboardList, MoreHorizontal, Paperclip, Plus, Search, Trash2, UserRound } from "lucide-react";
import { api, normalizeStatus, statusForApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ProjectMember, Subtask, Task, TaskStatus } from "@/lib/types";
import { Avatar, EmptyState, ErrorMessage, LoadingBlock, Modal, Toast, type ToastMessage } from "@/components/ui";

const columns: { id: TaskStatus; label: string; caption: string; icon: typeof Circle; color: string; bg: string }[] = [
  { id: "todo", label: "To do", caption: "Up next", icon: Circle, color: "#7b75a0", bg: "#efedf6" },
  { id: "in_progress", label: "In progress", caption: "Work in motion", icon: Clock3, color: "#b77b25", bg: "#fff1df" },
  { id: "done", label: "Done", caption: "Wrapped up", icon: CheckCircle2, color: "#278e6a", bg: "#e6f7ef" },
];

function assignedUser(task: Task) { return typeof task.assignedTo === "object" ? task.assignedTo : undefined; }
function assignedUserId(task: Task) { return typeof task.assignedTo === "string" ? task.assignedTo : task.assignedTo?._id; }
function taskName(task: Task) { const user = assignedUser(task); return user?.fullName || user?.username; }
function displayStatus(value: string) { return normalizeStatus(value) === "in_progress" ? "In progress" : normalizeStatus(value) === "done" ? "Done" : "To do"; }

export default function ProjectTasksPage() {
  const params = useParams<{ projectId: string }>(); const projectId = params.projectId; const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]); const [members, setMembers] = useState<ProjectMember[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false); const [newTitle, setNewTitle] = useState(""); const [newDescription, setNewDescription] = useState(""); const [newAssignee, setNewAssignee] = useState(""); const [newFiles, setNewFiles] = useState<File[]>([]); const [fileError, setFileError] = useState(""); const [createBusy, setCreateBusy] = useState(false); const [createError, setCreateError] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null); const [detailLoading, setDetailLoading] = useState(false); const [editTitle, setEditTitle] = useState(""); const [editDescription, setEditDescription] = useState(""); const [editAssignee, setEditAssignee] = useState(""); const [editStatus, setEditStatus] = useState<TaskStatus>("todo"); const [editBusy, setEditBusy] = useState(false); const [subtaskTitle, setSubtaskTitle] = useState(""); const [subtaskBusy, setSubtaskBusy] = useState(false); const [busyTaskIds, setBusyTaskIds] = useState<string[]>([]); const [toast, setToast] = useState<ToastMessage>(null); const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  const load = useCallback(async () => { setLoading(true); setError(""); try { const [nextTasks, nextMembers] = await Promise.all([api.tasks.list(projectId), api.projects.members(projectId).catch(() => [])]); setTasks(Array.isArray(nextTasks) ? nextTasks : []); setMembers(nextMembers); } catch (err) { setError(err instanceof Error ? err.message : "Could not load tasks."); } finally { setLoading(false); } }, [projectId]);
  useEffect(() => { void load(); }, [load]);
  const myRole = members.find((member) => member.user?._id === user?._id)?.role;
  const canManageTasks = myRole === "admin" || myRole === "project_admin";
  const canDeleteTasks = myRole === "admin";
  const canUpdateTaskStatus = (task: Task) => canManageTasks || (myRole === "member" && assignedUserId(task) === user?._id);

  const filtered = useMemo(() => { const term = search.trim().toLowerCase(); return tasks.filter((task) => !term || `${task.title} ${task.description || ""} ${taskName(task) || ""}`.toLowerCase().includes(term)); }, [tasks, search]);
  const counts = useMemo(() => ({ todo: filtered.filter((t) => normalizeStatus(t.status) === "todo").length, in_progress: filtered.filter((t) => normalizeStatus(t.status) === "in_progress").length, done: filtered.filter((t) => normalizeStatus(t.status) === "done").length }), [filtered]);

  async function createTask(event: React.FormEvent) {
    event.preventDefault(); if (!canManageTasks) return; if (!newTitle.trim()) { setCreateError("A task title is required."); return; }
    if (fileError) return;
    setCreateBusy(true); setCreateError("");
    try { const payload = { title: newTitle.trim(), description: newDescription.trim(), ...(newAssignee ? { assignedTo: newAssignee } : {}), status: "todo" }; if (newFiles.length) await api.tasks.createWithAttachments(projectId, payload, newFiles); else await api.tasks.create(projectId, payload); setCreateOpen(false); setNewTitle(""); setNewDescription(""); setNewAssignee(""); setNewFiles([]); setFileError(""); await load(); setToast({ type: "success", message: "Task created." }); }
    catch (err) { setCreateError(err instanceof Error ? err.message : "Could not create the task."); }
    finally { setCreateBusy(false); }
  }

  async function openTask(task: Task) {
    setSelectedTask(task); setEditTitle(task.title); setEditDescription(task.description || ""); setEditAssignee(typeof task.assignedTo === "string" ? task.assignedTo : task.assignedTo?._id || ""); setEditStatus(normalizeStatus(task.status)); setDetailLoading(true);
    try { const detail = await api.tasks.get(projectId, task._id); setSelectedTask(detail); setEditTitle(detail.title); setEditDescription(detail.description || ""); setEditAssignee(typeof detail.assignedTo === "string" ? detail.assignedTo : detail.assignedTo?._id || ""); setEditStatus(normalizeStatus(detail.status)); }
    catch { /* Use the task summary if the detail endpoint has a backend issue. */ }
    finally { setDetailLoading(false); }
  }

  async function saveTask(event: React.FormEvent) {
    event.preventDefault(); if (!canManageTasks || !selectedTask || !editTitle.trim()) return;
    setEditBusy(true);
    try {
      await api.tasks.update(projectId, selectedTask._id, { title: editTitle.trim(), description: editDescription.trim(), status: statusForApi(editStatus), assignedTo: editAssignee });
      setToast({ type: "success", message: "Task updated." }); setSelectedTask(null); await load();
    } catch (err) { setToast({ type: "error", message: err instanceof Error ? err.message : "Could not update the task." }); }
    finally { setEditBusy(false); }
  }

  async function changeStatus(task: Task, value: TaskStatus) {
    if (!canUpdateTaskStatus(task)) return;
    const oldStatus = normalizeStatus(task.status); if (oldStatus === value) return;
    setBusyTaskIds((list) => [...list, task._id]);
    try { await api.tasks.update(projectId, task._id, { status: statusForApi(value) }); setTasks((list) => list.map((item) => item._id === task._id ? { ...item, status: value } : item)); setToast({ type: "success", message: `Moved to ${displayStatus(value)}.` }); }
    catch (err) { setToast({ type: "error", message: err instanceof Error ? err.message : "Could not update task status." }); }
    finally { setBusyTaskIds((list) => list.filter((id) => id !== task._id)); }
  }

  async function addSubtask() {
    if (!selectedTask || !subtaskTitle.trim()) return;
    setSubtaskBusy(true);
    try {
      await api.tasks.createSubtask(projectId, selectedTask._id, subtaskTitle.trim());
      setSubtaskTitle("");
      await load();
      try { const detail = await api.tasks.get(projectId, selectedTask._id); setSelectedTask(detail); setToast({ type: "success", message: "Subtask added." }); }
      catch { setToast({ type: "info", message: "Subtask was created, but the backend task-detail endpoint could not reload its list. See the backend notes in README." }); }
    } catch (err) { setToast({ type: "error", message: err instanceof Error ? err.message : "Could not add subtask." }); }
    finally { setSubtaskBusy(false); }
  }

  async function toggleSubtask(subtask: Subtask) {
    if (!selectedTask) return;
    try {
      await api.tasks.updateSubtask(projectId, subtask._id, { isCompleted: !subtask.isCompleted });
      await load();
      try { const detail = await api.tasks.get(projectId, selectedTask._id); setSelectedTask(detail); setToast({ type: "success", message: "Subtask updated." }); }
      catch { setToast({ type: "info", message: "Subtask was updated, but the backend task-detail endpoint could not reload its list." }); }
    } catch (err) { setToast({ type: "error", message: err instanceof Error ? err.message : "Could not update subtask." }); }
  }

  async function deleteSelectedTask() {
    if (!canDeleteTasks || !deleteTask) return;
    try { await api.tasks.remove(projectId, deleteTask._id); setDeleteTask(null); setSelectedTask(null); await load(); setToast({ type: "success", message: "Task deleted." }); }
    catch (err) { setToast({ type: "error", message: err instanceof Error ? err.message : "You may not have permission to delete this task." }); }
  }

  return <>
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="text-[15px] font-[800] tracking-[-.03em]">Task board <span className="ml-1 text-[11px] font-[650] text-[#a09db0]">{loading ? "" : tasks.length}</span></div><p className="mt-1 text-[11px] text-[#9692a7]">Keep work moving with clear ownership and small next steps.</p></div><div className="flex flex-wrap items-center gap-2"><div className="field-wrap w-full sm:w-[220px]"><Search size={14} className="field-icon"/><input className="field field-with-icon h-[38px]" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)}/></div>{canManageTasks && <button className="btn btn-primary h-[38px]" onClick={() => { setCreateError(""); setFileError(""); setNewFiles([]); setCreateOpen(true); }}><Plus size={15}/> Add task</button>}</div></div>
    <div className="mb-5 flex flex-wrap items-center gap-2">{columns.map((column) => { const Icon = column.icon; return <div key={column.id} className="flex items-center gap-2 rounded-xl border border-[#eceaf3] bg-white px-3 py-2"><span className="flex h-6 w-6 items-center justify-center rounded-[8px]" style={{ background: column.bg, color: column.color }}><Icon size={13}/></span><span className="text-[10px] font-[750] text-[#5d596f]">{column.label}</span><span className="rounded-md bg-[#f8f7fb] px-1.5 py-0.5 text-[9px] font-[800] text-[#8f8ba2]">{counts[column.id]}</span></div>; })}</div>
    {error && <div className="mb-5"><ErrorMessage>{error}</ErrorMessage></div>}
    {loading ? <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{[0,1,2].map((i) => <div key={i} className="panel p-4"><LoadingBlock rows={3}/></div>)}</div> : tasks.length === 0 ? <div className="panel"><EmptyState icon={<ClipboardList size={24}/>} title="Your board is clear — for now" description="Add the first task to give this project its next step. You can assign it to a teammate and track it across the board." action={canManageTasks ? <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={14}/> Create a task</button> : undefined}/></div> : filtered.length === 0 ? <div className="panel"><EmptyState icon={<Search size={23}/>} title="No tasks found" description="Try another keyword or clear your search." action={<button className="btn btn-outline" onClick={() => setSearch("")}>Clear search</button>}/></div> : <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">{columns.map((column) => { const Icon = column.icon; const columnTasks = filtered.filter((task) => normalizeStatus(task.status) === column.id); return <section key={column.id} className="min-w-0 overflow-hidden rounded-[17px] border border-[#eae8f2] bg-[#f0eff6]/70 p-3 sm:p-3.5"><div className="mb-3 flex items-center justify-between gap-2 px-1.5 py-1"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-[9px]" style={{ background: column.bg, color: column.color }}><Icon size={14}/></span><div><h3 className="text-[11px] font-[800] text-[#47435d]">{column.label}</h3><p className="mt-0.5 text-[9px] text-[#a09db0]">{column.caption}</p></div></div><span className="text-[10px] font-[800] text-[#a09db0]">{columnTasks.length}</span></div>
      <div className="space-y-2.5">{columnTasks.map((task) => { const assignee = assignedUser(task); const isBusy = busyTaskIds.includes(task._id); return <article key={task._id} className="group rounded-[14px] border border-[#e9e7f1] bg-white p-4 shadow-[0_2px_4px_rgba(45,37,89,.015)] transition hover:border-[#d4cff5] hover:shadow-[0_8px_22px_rgba(45,37,89,.05)]"><button className="block w-full text-left" onClick={() => void openTask(task)}><div className="mb-2.5 flex items-center justify-between gap-2"><span className="text-[9px] font-[800] uppercase tracking-[.09em] text-[#aaa6b8]">TASK-{task._id.slice(-5).toUpperCase()}</span><MoreHorizontal size={15} className="text-[#b2afc0] opacity-60 group-hover:opacity-100"/></div><h4 className="line-clamp-2 text-[12px] font-[800] leading-[1.5] text-[#353149]">{task.title}</h4>{task.description && <p className="mt-1.5 line-clamp-2 text-[10px] leading-5 text-[#9692a7]">{task.description}</p>}</button><div className="mt-4 flex items-center justify-between gap-2 border-t border-[#f1eff6] pt-3"><div className="flex min-w-0 items-center gap-2">{assignee ? <><Avatar name={assignee.fullName || assignee.username} src={assignee.avatar?.url} size="xs"/><span className="max-w-[100px] truncate text-[9px] font-[650] text-[#8a879b]">{assignee.fullName || `@${assignee.username}`}</span></> : <span className="flex items-center gap-1 text-[9px] text-[#aaa7b8]"><UserRound size={12}/> Unassigned</span>}</div>{canUpdateTaskStatus(task) ? <select value={normalizeStatus(task.status)} disabled={isBusy} onChange={(event) => void changeStatus(task, event.target.value as TaskStatus)} className="max-w-[116px] rounded-lg border border-[#efedf5] bg-[#fbfaff] px-2 py-1.5 text-[9px] font-[750] text-[#77738b] outline-none focus:border-[#cfc8fa]" aria-label={`Change status of ${task.title}`}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select> : <span className={`pill ${normalizeStatus(task.status) === "done" ? "pill-green" : normalizeStatus(task.status) === "in_progress" ? "pill-amber" : "pill-gray"}`}>{displayStatus(task.status)}</span>}</div></article>; })}</div>
      {canManageTasks && <button onClick={() => { setCreateError(""); setFileError(""); setNewFiles([]); setCreateOpen(true); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#dcd9e8] py-2.5 text-[10px] font-[750] text-[#9793a9] transition hover:border-[#bcb4f4] hover:bg-white hover:text-[#6557e8]"><Plus size={13}/> Add a task</button>}
    </section>; })}</div>}

    {canManageTasks && <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add a task" description="Keep it actionable. You can add more detail once it’s on the board.">
      <form className="space-y-4" onSubmit={createTask}>{(createError || fileError) && <ErrorMessage>{createError || fileError}</ErrorMessage>}<div><label className="field-label" htmlFor="task-title">Task title</label><input id="task-title" autoFocus required maxLength={180} className="field" placeholder="What needs to get done?" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}/></div><div><label className="field-label" htmlFor="task-description">Description <span className="font-normal text-[#aaa7b7]">(optional)</span></label><textarea id="task-description" className="field" placeholder="Add helpful context, requirements, or acceptance criteria." value={newDescription} onChange={(e) => setNewDescription(e.target.value)}/></div><div><label className="field-label" htmlFor="task-assignee">Assign to <span className="font-normal text-[#aaa7b7]">(optional)</span></label><select id="task-assignee" className="field" value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)}><option value="">Unassigned</option>{members.map((member) => <option key={member.user?._id} value={member.user?._id}>{member.user?.fullName || member.user?.username || member.user?.email}</option>)}</select></div><div><label className="field-label" htmlFor="task-attachments">Attachments <span className="font-normal text-[#aaa7b7]">(up to 5 files, 5 MB each)</span></label><input id="task-attachments" type="file" multiple accept="image/*,application/pdf,text/*" className="field file:mr-3 file:rounded-lg file:border-0 file:bg-[#f0edff] file:px-3 file:py-2 file:text-[10px] file:font-[750] file:text-[#6557e8]" onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length > 5) { setFileError("Choose no more than 5 files."); setNewFiles([]); } else if (files.some((file) => file.size > 5 * 1024 * 1024)) { setFileError("Each attachment must be 5 MB or smaller."); setNewFiles([]); } else { setFileError(""); setNewFiles(files); } }}/>{newFiles.length > 0 && <p className="mt-1 text-[10px] text-[#8c879f]">{newFiles.length} file{newFiles.length === 1 ? "" : "s"} selected</p>}</div><div className="flex justify-end gap-2 pt-2"><button className="btn btn-outline" type="button" onClick={() => { setCreateOpen(false); setNewFiles([]); setFileError(""); }}>Cancel</button><button className="btn btn-primary" disabled={createBusy || !newTitle.trim()}>{createBusy ? "Adding task…" : "Add task"}<Plus size={14}/></button></div></form>
    </Modal>}

    <Modal open={!!selectedTask} onClose={() => setSelectedTask(null)} title="Task details" description={selectedTask ? `Task-${selectedTask._id.slice(-5).toUpperCase()} · Review details, assignment, and subtasks.` : undefined} width="600px">
      {selectedTask && <form className="space-y-4" onSubmit={saveTask}>{detailLoading && <div className="text-[10px] text-[#9b97aa]">Loading full task details…</div>}<div><label className="field-label" htmlFor="edit-task-title">Title</label><input id="edit-task-title" className="field" required disabled={!canManageTasks} value={editTitle} onChange={(e) => setEditTitle(e.target.value)}/></div><div><label className="field-label" htmlFor="edit-task-description">Description</label><textarea id="edit-task-description" className="field" disabled={!canManageTasks} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="No description yet."/></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label className="field-label" htmlFor="edit-task-status">Status</label><select id="edit-task-status" className="field" disabled={!canManageTasks} value={editStatus} onChange={(e) => setEditStatus(e.target.value as TaskStatus)}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></div><div><label className="field-label" htmlFor="edit-task-assignee">Assignee</label><select id="edit-task-assignee" className="field" disabled={!canManageTasks} value={editAssignee} onChange={(e) => setEditAssignee(e.target.value)}><option value="">Unassigned</option>{members.map((member) => <option key={member.user?._id} value={member.user?._id}>{member.user?.fullName || member.user?.username}</option>)}</select></div></div>
        <div className="rounded-xl border border-[#efedf5] p-4"><div className="mb-3 flex items-center justify-between gap-2"><div><div className="text-[11px] font-[800]">Subtasks</div><div className="mt-1 text-[10px] text-[#9b97aa]">Break the task into smaller steps.</div></div><span className="pill pill-gray">{(selectedTask.subtasks || []).filter((sub) => sub.isCompleted).length}/{(selectedTask.subtasks || []).length}</span></div>{(selectedTask.subtasks || []).length === 0 ? <p className="pb-2 text-[10px] text-[#a09db0]">No subtasks yet.</p> : <div className="mb-3 space-y-1.5">{(selectedTask.subtasks || []).map((subtask) => <div key={subtask._id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-[#faf9fd]"><button type="button" aria-label={subtask.isCompleted ? "Mark subtask incomplete" : "Mark subtask complete"} onClick={() => void toggleSubtask(subtask)} className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${subtask.isCompleted ? "border-[#42af88] bg-[#42af88] text-white" : "border-[#d4d0e0] text-transparent hover:border-[#8172e8]"}`}><Check size={10}/></button><span className={`flex-1 text-[10px] ${subtask.isCompleted ? "text-[#a7a3b4] line-through" : "text-[#5a566e]"}`}>{subtask.title}</span></div>)}</div>}<div className="flex gap-2"><input className="field h-[37px] text-[11px]" placeholder="Add a subtask…" value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)}/><button disabled={subtaskBusy || !subtaskTitle.trim()} className="btn btn-outline btn-sm" type="button" onClick={() => void addSubtask()}><Plus size={13}/> Add</button></div></div>
        {selectedTask.attachments && selectedTask.attachments.length > 0 && <div><div className="field-label">Attachments</div><div className="space-y-2">{selectedTask.attachments.map((file, i) => <a key={`${file.url}-${i}`} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-[#efedf5] p-2.5 text-[10px] text-[#6557e8]"><Paperclip size={14}/>{file.url.split("/").pop() || `Attachment ${i + 1}`}<ArrowRight size={12} className="ml-auto"/></a>)}</div></div>}
        <div className="flex flex-col-reverse gap-2 border-t border-[#f0eef6] pt-4 sm:flex-row sm:items-center sm:justify-between">{canDeleteTasks ? <button type="button" onClick={() => { setDeleteTask(selectedTask); }} className="btn btn-danger btn-sm"><Trash2 size={13}/> Delete task</button> : <span className="text-[10px] text-[#a09db0]">{canManageTasks ? "Project admin permissions" : "You can update subtasks in this task."}</span>}<div className="flex justify-end gap-2"><button className="btn btn-outline" type="button" onClick={() => setSelectedTask(null)}>{canManageTasks ? "Cancel" : "Close"}</button>{canManageTasks && <button className="btn btn-primary" disabled={editBusy}>{editBusy ? "Saving…" : "Save changes"}</button>}</div></div>
      </form>}
    </Modal>
    {canDeleteTasks && <Modal open={!!deleteTask} onClose={() => setDeleteTask(null)} title="Delete this task?" description="The task and its subtasks will be removed from this project."><div className="rounded-xl border border-[#f3dce0] bg-[#fff7f8] p-4 text-[12px] leading-5 text-[#a24759]">Delete <strong>{deleteTask?.title}</strong>? This cannot be undone.</div><div className="mt-5 flex justify-end gap-2"><button className="btn btn-outline" onClick={() => setDeleteTask(null)}>Cancel</button><button className="btn btn-danger" onClick={() => void deleteSelectedTask()}><Trash2 size={14}/> Delete task</button></div></Modal>}
    <Toast value={toast} onDismiss={() => setToast(null)}/>
  </>;
}
