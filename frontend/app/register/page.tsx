"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { ErrorMessage } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await register({ fullName: fullName.trim(), username: username.trim().toLowerCase(), email: email.trim().toLowerCase(), password });
      setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create your account."); }
    finally { setBusy(false); }
  }

  return <AuthShell mode="register">
    {done ? <div className="py-8"><div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#e7f8f0] text-[#269870]"><Mail size={25}/></div><div className="eyebrow mb-3">One last step</div><h2 className="text-[28px] font-[800] tracking-[-.05em]">Check your inbox.</h2><p className="mt-3 text-[13px] leading-6 text-[#89869b]">Your account request was sent. Follow the verification link from your email, then sign in to your workspace.</p><Link className="btn btn-primary mt-7 w-full" href="/login">Back to sign in <ArrowRight size={15}/></Link></div> : <>
      <div className="mb-6"><div className="eyebrow mb-3">Make room for great work</div><h2 className="text-[28px] font-[800] tracking-[-.05em] text-[#28253d] sm:text-[31px]">Create your account.</h2><p className="mt-2 text-[13px] leading-6 text-[#89869b]">Your next well-organized project starts here.</p></div>
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div><label htmlFor="fullName" className="field-label">Full name <span className="font-normal text-[#aaa7b7]">(optional)</span></label><div className="field-wrap"><UserRound size={16} className="field-icon"/><input id="fullName" className="field field-with-icon h-[43px]" placeholder="Abhishek Kumar" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)}/></div></div>
        <div><label htmlFor="username" className="field-label">Username</label><div className="field-wrap"><span className="field-icon text-[13px] font-bold">@</span><input id="username" required minLength={3} pattern="[a-z0-9_]+" title="Use lowercase letters, numbers, or underscores." className="field field-with-icon h-[43px]" placeholder="yourname" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}/></div><p className="mt-1.5 text-[10px] text-[#a09db0]">Lowercase letters, numbers, and underscores.</p></div>
        <div><label htmlFor="email" className="field-label">Work email</label><div className="field-wrap"><Mail size={16} className="field-icon"/><input id="email" type="email" required autoComplete="email" className="field field-with-icon h-[43px]" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)}/></div></div>
        <div><label htmlFor="password" className="field-label">Password</label><div className="field-wrap"><LockKeyhole size={16} className="field-icon"/><input id="password" type={showPassword ? "text" : "password"} required minLength={8} autoComplete="new-password" className="field field-with-icon h-[43px] pr-11" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)}/><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a09db3]" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></div>
        <button disabled={busy} className="btn btn-primary mt-2 h-[46px] w-full">{busy ? "Creating your account…" : "Create account"}<ArrowRight size={16}/></button>
        <p className="pt-1 text-center text-[12px] text-[#8a879b]">Already have an account? <Link href="/login" className="font-[750] text-[#6557e8] hover:text-[#4f42c6]">Sign in</Link></p>
      </form>
      <p className="mt-5 text-center text-[10px] leading-5 text-[#aaa7b7]">By continuing, you agree to use this workspace responsibly.</p>
    </>}
  </AuthShell>;
}
