"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { ErrorMessage } from "@/components/ui";
import { api } from "@/lib/api";

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>(); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(""); if (password !== confirm) { setError("Passwords do not match."); return; } setBusy(true); try { await api.auth.resetPassword(params.token, password); setDone(true); } catch (err) { setError(err instanceof Error ? err.message : "The reset link may be expired."); } finally { setBusy(false); } }
  return <AuthShell mode="reset"><div className="mb-8"><div className="eyebrow mb-3">Secure your account</div><h2 className="text-[29px] font-[800] tracking-[-.05em]">Set a new password.</h2><p className="mt-2 text-[13px] leading-6 text-[#89869b]">Choose a strong password you haven’t used here before.</p></div>{done ? <div className="space-y-4"><p className="rounded-xl border border-[#d7f0e4] bg-[#effaf5] p-4 text-[12px] leading-5 text-[#267b5d]">Your password has been updated.</p><Link href="/login" className="btn btn-primary w-full">Continue to sign in <ArrowRight size={15}/></Link></div> : <form onSubmit={submit} className="space-y-4">{error && <ErrorMessage>{error}</ErrorMessage>}<div><label className="field-label" htmlFor="password">New password</label><div className="field-wrap"><LockKeyhole size={16} className="field-icon"/><input id="password" required minLength={8} type="password" className="field field-with-icon h-[45px]" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"/></div></div><div><label className="field-label" htmlFor="confirm">Confirm password</label><input id="confirm" required minLength={8} type="password" className="field h-[45px]" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password"/></div><button className="btn btn-primary w-full" disabled={busy}>{busy ? "Updating password…" : "Update password"}<ArrowRight size={15}/></button><p className="text-center text-[11px] text-[#9692a7]">Remembered it? <Link href="/login" className="font-bold text-[#6557e8]">Sign in</Link></p></form>}</AuthShell>;
}
