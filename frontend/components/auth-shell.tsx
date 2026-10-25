import Link from "next/link";
import { ArrowUpRight, CheckSquare, CircleDot, Sparkles, Users, Zap } from "lucide-react";
import { BrandMark } from "@/components/ui";

export function AuthShell({ children, mode = "login" }: { children: React.ReactNode; mode?: "login" | "register" | "forgot" | "reset" }) {
  const highlights = mode === "register" ? ["Bring all your work into one place", "Give everyone clarity on what matters", "Celebrate progress as a team"] : ["Make space for meaningful work", "Keep projects moving, not just busy", "Stay aligned without the extra noise"];
  return <main className="auth-bg flex min-h-screen flex-col overflow-hidden lg:flex-row">
    <section className="relative flex min-h-[290px] flex-col justify-between overflow-hidden bg-[#242138] px-7 py-7 text-white sm:px-10 sm:py-9 lg:min-h-screen lg:w-[47%] lg:px-14 lg:py-12 xl:px-[7vw]">
      <div className="absolute inset-0 opacity-20 soft-grid"/><div className="absolute -right-28 top-[22%] h-[440px] w-[440px] rounded-full border border-white/15"/><div className="absolute -right-8 top-[29%] h-[300px] w-[300px] rounded-full border border-white/10"/><div className="absolute -bottom-36 -left-24 h-[420px] w-[420px] rounded-full bg-[#6557e8]/25 blur-[60px]"/>
      <Link href="/login" className="relative z-10 flex w-fit items-center gap-3"><BrandMark size="md"/><div><div className="text-[17px] font-[850] tracking-[-.055em]">project<span className="text-[#a9a0ff]">flow</span></div><div className="mt-0.5 text-[9px] font-[750] uppercase tracking-[.16em] text-white/45">Your team's space</div></div></Link>
      <div className="relative z-10 max-w-[520px] py-8 lg:py-0">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3 py-1.5 text-[10px] font-[750] tracking-wide text-[#c9c3ff]"><Sparkles size={13}/> A calmer way to do great work</div>
        <h1 className="max-w-[490px] text-[35px] font-[780] leading-[1.1] tracking-[-.06em] sm:text-[47px] xl:text-[54px]">Good work starts with <span className="text-[#aaa1ff]">a clear plan.</span></h1>
        <p className="mt-5 max-w-[430px] text-[13px] leading-6 text-white/55 sm:text-[14px]">From first idea to final delivery, bring your projects, tasks, and people together in one thoughtful workspace.</p>
        <div className="mt-8 hidden space-y-3 sm:block">{highlights.map((line, index) => <div key={line} className="flex items-center gap-3 text-[12px] text-white/75"><span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[.06] text-[#aaa1ff]">{index === 0 ? <CheckSquare size={12}/> : index === 1 ? <Users size={12}/> : <Zap size={12}/>}</span>{line}</div>)}</div>
        <div className="mt-10 hidden max-w-[410px] rounded-2xl border border-white/10 bg-white/[.06] p-4 backdrop-blur sm:block"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#a39aff]/15 text-[#bcb5ff]"><CircleDot size={17}/></div><div className="min-w-0 flex-1"><div className="text-[11px] font-[750]">A little progress, every day</div><div className="mt-1 text-[10px] text-white/45">One place for the work that matters.</div></div><ArrowUpRight size={15} className="text-white/45"/></div></div>
      </div>
      <div className="relative z-10 mt-4 flex items-center justify-between text-[10px] text-white/35 lg:mt-0"><span>© {new Date().getFullYear()} ProjectFlow</span><span>Built for better collaboration</span></div>
    </section>
    <section className="flex flex-1 items-start justify-center px-5 py-9 sm:px-8 sm:py-12 lg:items-center lg:px-10 xl:px-16"><div className="w-full max-w-[420px]">{children}<div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-[#aaa7b8]"><span className="h-1.5 w-1.5 rounded-full bg-[#65c49f]"/> Your work is private to your workspace</div></div></section>
  </main>;
}
