"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { ErrorMessage } from "@/components/ui";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [sent, setSent] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { await api.auth.forgotPassword(email.trim()); setSent(true); } catch (err) { setError(err instanceof Error ? err.message : "Could not request a password reset."); } finally { setBusy(false); } }
  return <AuthShell mode="forgot">
    {sent ? <div className="py-7"><div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#e7f8f0] text-[#1f7e5c]"><CheckCircle2 size={26}/></div><div className="eyebrow mb-3">Request received</div><h2 className="text-[28px] font-[800] tracking-[-.05em]">Look for an email.</h2><p className="mt-3 text-[13px] leading-6 text-[#706d7f]">If the account exists and email delivery is configured, you’ll receive a link to reset your password.</p><Link href="/login" className="btn btn-primary mt-7 w-full">Back to sign in</Link></div> : <>
      <Link href="/login" className="mb-7 inline-flex items-center gap-2 text-[11px] font-[700] text-[#706d81] hover:text-[#5b49ce]"><ArrowLeft size={14}/> Back to sign in</Link><div className="mb-8"><div className="eyebrow mb-3">Account recovery</div><h2 className="text-[29px] font-[800] tracking-[-.05em]">Forgot your password?</h2><p className="mt-2 text-[13px] leading-6 text-[#706d7f]">Share your account email and we’ll send instructions to get you back in.</p></div>
      <form onSubmit={submit} className="space-y-5">{error && <ErrorMessage>{error}</ErrorMessage>}<div><label htmlFor="email" className="field-label">Email address</label><div className="field-wrap"><Mail size={16} className="field-icon"/><input id="email" type="email" required className="field field-with-icon h-[46px]" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)}/></div></div><button className="btn btn-primary h-[46px] w-full" disabled={busy}>{busy ? "Sending request…" : "Send reset instructions"}</button></form>
    </>}
  </AuthShell>;
}
