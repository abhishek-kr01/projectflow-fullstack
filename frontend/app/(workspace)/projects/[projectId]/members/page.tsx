"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Search, ShieldCheck, Shield, Trash2, Users, UserPlus } from "lucide-react";
import { API_BASE_URL, api } from "@/lib/api";
import type { ProjectMember, ProjectPresence, UserRole } from "@/lib/types";
import { Avatar, EmptyState, ErrorMessage, LoadingBlock, Modal, Toast, type ToastMessage } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

const roles: { value: UserRole; label: string }[] = [{ value: "project_admin", label: "Project admin" }, { value: "member", label: "Member" }];

export default function ProjectMembersPage() {
  const params = useParams<{ projectId: string }>(); const projectId = params.projectId; const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]); const [presenceByUser, setPresenceByUser] = useState<Record<string, ProjectPresence>>({}); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false); const [email, setEmail] = useState(""); const [role, setRole] = useState<UserRole>("member"); const [busy, setBusy] = useState(false); const [formError, setFormError] = useState(""); const [toast, setToast] = useState<ToastMessage>(null); const [removeTarget, setRemoveTarget] = useState<ProjectMember | null>(null);

  const load = useCallback(async () => { setLoading(true); setError(""); try { setMembers(await api.projects.members(projectId)); } catch (err) { setError(err instanceof Error ? err.message : "Could not load project members."); } finally { setLoading(false); } }, [projectId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let active = true;
    let source: EventSource | null = null;
    const syncPresence = async () => {
      try {
        const result = await api.realtime.projectPresence(projectId);
        if (active) setPresenceByUser(Object.fromEntries(result.map((item) => [item.userId, item])));
      } catch { /* Presence is supplemental; keep member management usable. */ }
    };
    void syncPresence();
    const timer = window.setInterval(() => { void syncPresence(); }, 20_000);
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
          if (next?.userId) setPresenceByUser((current) => ({ ...current, [next.userId]: { ...current[next.userId], ...next } }));
        } catch { /* Ignore malformed presence event. */ }
      });
    };
    connect();
    window.addEventListener("projectflow:token-refreshed", connect);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("projectflow:token-refreshed", connect); source?.close(); };
  }, [projectId]);

  const filtered = members.filter((member) => `${member.user?.fullName || ""} ${member.user?.username || ""} ${member.user?.email || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const admins = members.filter((member) => member.role === "admin" || member.role === "project_admin").length;
  const canManageMembers = members.some((member) => member.user?._id === user?._id && member.role === "admin");

  async function addMember(event: React.FormEvent) { event.preventDefault(); setFormError(""); setBusy(true); try { await api.projects.addMember(projectId, email.trim().toLowerCase(), role); setAddOpen(false); setEmail(""); setRole("member"); await load(); setToast({ type: "success", message: "Member added to the project." }); } catch (err) { setFormError(err instanceof Error ? err.message : "Could not add that person."); } finally { setBusy(false); } }
  async function changeRole(member: ProjectMember, nextRole: UserRole) { const userId = member.user?._id; if (!userId || member.role === nextRole) return; try { await api.projects.updateMemberRole(projectId, userId, nextRole); setMembers((current) => current.map((item) => item.user?._id === userId ? { ...item, role: nextRole } : item)); setToast({ type: "success", message: "Member role updated." }); } catch (err) { setToast({ type: "error", message: err instanceof Error ? err.message : "Could not update member role." }); } }
  async function removeMember() { if (!removeTarget?.user?._id) return; setBusy(true); try { await api.projects.removeMember(projectId, removeTarget.user._id); setMembers((current) => current.filter((member) => member.user?._id !== removeTarget.user._id)); setRemoveTarget(null); setToast({ type: "success", message: "Member removed from the project." }); } catch (err) { setToast({ type: "error", message: err instanceof Error ? err.message : "Could not remove this member." }); } finally { setBusy(false); } }

  return <>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-1 text-[15px] font-[800] tracking-[-.03em]">People & permissions</div><p className="text-[11px] text-[#706d7d]">Bring the right people in and keep access clear.</p></div>{canManageMembers && <button className="btn btn-primary w-fit" onClick={() => { setFormError(""); setAddOpen(true); }}><UserPlus size={15}/> Add member</button>}</div>
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="panel flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#f0edff] text-[#5a48c0]"><Users size={17}/></div><div><div className="text-[23px] font-[800] tracking-[-.05em]">{loading ? "—" : members.length}</div><div className="mt-0.5 text-[10px] text-[#706d7d]">Total members</div></div></div><div className="panel flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#e9f8f1] text-[#207d60]"><ShieldCheck size={17}/></div><div><div className="text-[23px] font-[800] tracking-[-.05em]">{loading ? "—" : admins}</div><div className="mt-0.5 text-[10px] text-[#706d7d]">Admins & project admins</div></div></div><div className="panel col-span-2 flex items-center gap-3 p-4 sm:col-span-1"><div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#fff3e0] text-[#97651f]"><Shield size={17}/></div><div><div className="text-[23px] font-[800] tracking-[-.05em]">{loading ? "—" : members.filter((m) => m.role === "member").length}</div><div className="mt-0.5 text-[10px] text-[#706d7d]">Contributors</div></div></div></div>
    <div className="panel overflow-hidden"><div className="flex flex-col gap-3 border-b border-[#f0eef6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><div className="text-[12px] font-[800]">Project members</div><div className="mt-1 text-[10px] text-[#706d7d]">Only existing accounts can be added by email.</div></div><div className="field-wrap w-full sm:max-w-[240px]"><Search size={14} className="field-icon"/><input className="field field-with-icon h-[37px]" placeholder="Search people..." value={search} onChange={(e) => setSearch(e.target.value)}/></div></div>
      {error && <div className="p-5"><ErrorMessage>{error}</ErrorMessage></div>}
      {loading ? <div className="p-5"><LoadingBlock rows={4}/></div> : filtered.length === 0 ? <EmptyState icon={<Users size={23}/>} title={members.length ? "No people match your search" : "This team is waiting for its people"} description={members.length ? "Try searching by name, username, or email." : "Invite teammates who already have an account so they can collaborate on tasks and notes."} action={members.length ? <button className="btn btn-outline" onClick={() => setSearch("")}>Clear search</button> : canManageMembers ? <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={14}/> Add your first member</button> : undefined}/> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Person</th><th>Role</th><th>Presence</th><th>Joined</th><th className="text-right">Manage</th></tr></thead><tbody>{filtered.map((member) => { const name = member.user?.fullName || member.user?.username || "Workspace member"; const isMe = member.user?._id === user?._id; return <tr key={member.user?._id}><td><div className="flex items-center gap-3"><Avatar name={name} src={member.user?.avatar?.url}/><div className="min-w-0"><div className="flex items-center gap-1.5 text-[11px] font-[750] text-[#403c55]">{name}{isMe && <span className="pill pill-violet !px-1.5 !py-0.5 !text-[8px]">You</span>}</div><div className="mt-1 truncate text-[10px] text-[#706d7c]">@{member.user?.username} · {member.user?.email || "No email shown"}</div></div></div></td><td><span className={`pill ${member.role === "admin" ? "pill-violet" : member.role === "project_admin" ? "pill-blue" : "pill-gray"}`}>{member.role === "project_admin" ? "Project admin" : member.role === "admin" ? "Admin" : "Member"}</span></td><td><span className={`inline-flex items-center gap-1.5 text-[10px] font-[750] ${presenceByUser[member.user?._id || ""]?.online ? "text-[#247c5e]" : "text-[#777489]"}`}><span className={`h-1.5 w-1.5 rounded-full ${presenceByUser[member.user?._id || ""]?.online ? "bg-[#36b37e]" : "bg-[#aaa6b8]"}`}/>{presenceByUser[member.user?._id || ""]?.online ? "Online" : "Offline"}</span>{!presenceByUser[member.user?._id || ""]?.online && presenceByUser[member.user?._id || ""]?.lastSeenAt && <div className="mt-1 whitespace-nowrap text-[9px] text-[#8b879b]">Last seen {new Date(presenceByUser[member.user?._id || ""]!.lastSeenAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>}</td><td className="whitespace-nowrap text-[10px]">{member.createdAt ? new Date(member.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</td><td><div className="flex items-center justify-end gap-2">{canManageMembers && member.role !== "admin" ? <><select aria-label={`Role for ${name}`} className="max-w-[125px] rounded-lg border border-[#eceaf3] bg-white px-2 py-1.5 text-[10px] font-[700] text-[#706c83] outline-none" value={member.role} onChange={(e) => void changeRole(member, e.target.value as UserRole)}><option value="project_admin">Project admin</option><option value="member">Member</option></select><button aria-label={`Remove ${name}`} className="icon-btn h-8 w-8 text-[#796c71] hover:border-[#f1d9df] hover:bg-[#fff7f8] hover:text-[#b94357]" onClick={() => setRemoveTarget(member)}><Trash2 size={13}/></button></> : <span className="text-[10px] text-[#706d7b]">{member.role === "admin" ? "Project owner" : "—"}</span>}</div></td></tr>; })}</tbody></table></div>}
      <div className="flex items-start gap-2 border-t border-[#f0eef6] bg-[#fcfbff] px-5 py-3.5 text-[10px] leading-5 text-[#706d7d]"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-[#6d64ba]"/> Permissions are enforced by the backend. Admins manage members; project admins can manage tasks and notes; members collaborate within their access level.</div>
    </div>

    <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add someone to this project" description="They need an existing account with this email address."><form onSubmit={addMember} className="space-y-4">{formError && <ErrorMessage>{formError}</ErrorMessage>}<div><label className="field-label" htmlFor="member-email">Email address</label><input id="member-email" type="email" required className="field" placeholder="teammate@company.com" value={email} onChange={(e) => setEmail(e.target.value)}/></div><div><label className="field-label" htmlFor="member-role">Project role</label><select id="member-role" className="field" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>{roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><p className="mt-1.5 text-[10px] leading-5 text-[#706d7d]">Admins can manage the project. Project admins can work with tasks and notes. Members can collaborate and update subtasks.</p></div><div className="flex justify-end gap-2 pt-1"><button type="button" className="btn btn-outline" onClick={() => setAddOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? "Adding member…" : "Add member"}<Plus size={14}/></button></div></form></Modal>
    <Modal open={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove this member?" description="They will no longer have access through this project membership."><div className="rounded-xl border border-[#f3dce0] bg-[#fff7f8] p-4 text-[12px] leading-5 text-[#a24759]">Remove <strong>{removeTarget?.user?.fullName || removeTarget?.user?.username}</strong> from this project?</div><div className="mt-5 flex justify-end gap-2"><button className="btn btn-outline" onClick={() => setRemoveTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={() => void removeMember()} disabled={busy}><Trash2 size={14}/>{busy ? "Removing…" : "Remove member"}</button></div></Modal>
    <Toast value={toast} onDismiss={() => setToast(null)}/>
  </>;
}
