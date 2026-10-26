"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, CircleAlert, LoaderCircle } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { api } from "@/lib/api";

export default function VerifyEmailPage() {
  const params = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email address…");

  useEffect(() => {
    let cancelled = false;
    api.auth.verifyEmail(params.token).then(() => {
      if (cancelled) return;
      setState("success");
      setMessage("Your email address has been verified. You can now sign in to your workspace.");
    }).catch((error: unknown) => {
      if (cancelled) return;
      setState("error");
      setMessage(error instanceof Error ? error.message : "This verification link may be expired or invalid.");
    });
    return () => { cancelled = true; };
  }, [params.token]);

  return <AuthShell mode="reset">
    <div className="py-6"><div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-[18px] ${state === "success" ? "bg-[#e7f8f0] text-[#1f7e5c]" : state === "error" ? "bg-[#fff0f2] text-[#b84a5d]" : "bg-[#f0edff] text-[#5a48c0]"}`}>{state === "loading" ? <LoaderCircle size={25} className="animate-spin"/> : state === "success" ? <BadgeCheck size={26}/> : <CircleAlert size={25}/>}</div><div className="eyebrow mb-3">Email verification</div><h2 className="text-[28px] font-[800] tracking-[-.05em]">{state === "success" ? "You’re all set." : state === "error" ? "We couldn’t verify that link." : "Verifying your email."}</h2><p className="mt-3 text-[13px] leading-6 text-[#706d7f]">{message}</p>{state !== "loading" && <Link href="/login" className="btn btn-primary mt-7 w-full">Continue to sign in <ArrowRight size={15}/></Link>}{state === "error" && <p className="mt-4 text-center text-[11px] leading-5 text-[#706d7d]">You may request a new verification email from account settings after signing in.</p>}</div>
  </AuthShell>;
}
