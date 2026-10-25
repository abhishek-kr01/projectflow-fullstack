"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { ErrorMessage } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (status === "authenticated") router.replace("/"); }, [status, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await login(email.trim(), password); router.replace("/"); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in. Please try again."); }
    finally { setBusy(false); }
  }

  return <AuthShell>
    <div className="mb-8"><div className="eyebrow mb-3">Welcome back</div><h2 className="text-[28px] font-[800] tracking-[-.05em] text-[#28253d] sm:text-[32px]">Let's get you in.</h2><p className="mt-2 text-[13px] leading-6 text-[#89869b]">Pick up right where you left off.</p></div>
    <form onSubmit={submit} className="space-y-5">
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <div><label htmlFor="email" className="field-label">Email address</label><div className="field-wrap"><Mail size={16} className="field-icon"/><input id="email" type="email" autoComplete="email" required className="field field-with-icon h-[46px]" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)}/></div></div>
      <div><div className="mb-[7px] flex items-center justify-between"><label htmlFor="password" className="field-label mb-0">Password</label><Link href="/forgot-password" className="text-[11px] font-[700] text-[#6557e8] hover:text-[#4f42c6]">Forgot password?</Link></div><div className="field-wrap"><LockKeyhole size={16} className="field-icon"/><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required className="field field-with-icon h-[46px] pr-11" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)}/><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a09db3] hover:text-[#615a86]" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></div>
      <button disabled={busy} className="btn btn-primary h-[47px] w-full text-[13px]">{busy ? "Signing you in…" : "Sign in to your workspace"}<ArrowRight size={16}/></button>
      <p className="text-center text-[12px] text-[#8a879b]">New to ProjectFlow? <Link href="/register" className="font-[750] text-[#6557e8] hover:text-[#4f42c6]">Create an account</Link></p>
    </form>
    <div className="mt-8 rounded-xl border border-[#eceaf3] bg-white/70 p-3.5"><div className="text-[10px] font-[800] uppercase tracking-[.1em] text-[#aaa7b7]">Getting started</div><p className="mt-1 text-[11px] leading-5 text-[#8a879b]">Use the account created with your ProjectFlow backend. New accounts may need email verification, depending on your backend setup.</p></div>
  </AuthShell>;
}
