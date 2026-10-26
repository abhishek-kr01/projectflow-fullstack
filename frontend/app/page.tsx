import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquareText,
  MoveRight,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Turn plans into progress",
  description:
    "ProjectFlow brings projects, tasks, teammates, and project notes into one clear, focused workspace.",
};

const features = [
  {
    number: "01",
    icon: FolderKanban,
    tone: "violet",
    title: "Every project has a home",
    description:
      "Keep goals, tasks, teammates, and important context together instead of scattered across tabs and chats.",
    bullets: ["Organized project spaces", "Quick project overview"],
  },
  {
    number: "02",
    icon: ListChecks,
    tone: "blue",
    title: "Make the next step obvious",
    description:
      "Turn large plans into actionable tasks, assign ownership, and see what is waiting, moving, or done.",
    bullets: ["Clear task status", "Progress you can scan"],
  },
  {
    number: "03",
    icon: Users,
    tone: "green",
    title: "Keep everyone in sync",
    description:
      "Bring project members and shared notes closer to the work, so people spend less time asking for context.",
    bullets: ["Team and role management", "Shared project notes"],
  },
  {
    number: "04",
    icon: Target,
    tone: "amber",
    title: "Focus on meaningful progress",
    description:
      "See the shape of your workload and decide what deserves attention next without adding another complex process.",
    bullets: ["Workspace at a glance", "A calmer daily workflow"],
  },
] as const;

const steps = [
  {
    number: "01",
    icon: FolderKanban,
    title: "Create a project",
    description:
      "Give a goal its own space, add a short description, and invite the people who need to be involved.",
  },
  {
    number: "02",
    icon: ListChecks,
    title: "Break it into tasks",
    description:
      "Capture the work, choose an owner, and make the status of each next step easy to understand.",
  },
  {
    number: "03",
    icon: CheckCircle2,
    title: "Move forward together",
    description:
      "Update progress, keep helpful notes close by, and use one shared view to stay aligned.",
  },
] as const;

const faqs = [
  {
    question: "What can I manage with ProjectFlow?",
    answer:
      "ProjectFlow is designed to help you organize projects, track tasks and subtasks, coordinate project members, and keep useful notes alongside the work.",
  },
  {
    question: "Can I use it for personal projects as well as team work?",
    answer:
      "Yes. The same project-and-task workflow can be useful for personal goals, study plans, side projects, or a small team coordinating shared work.",
  },
  {
    question: "How do I get started?",
    answer:
      "Create an account and verify your email if your backend requires it. After signing in, open your dashboard and create your first project.",
  },
  {
    question: "Does the landing page work on mobile?",
    answer:
      "Yes. The navigation, hero, preview, feature sections, and calls to action adapt to smaller screens. The app dashboard also has its own responsive layout.",
  },
];

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="ProjectFlow home"
      className="group inline-flex w-fit items-center gap-3"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#6557e8] text-white shadow-[0_8px_20px_rgba(101,87,232,.25)] transition duration-200 group-hover:-rotate-3 group-hover:scale-105">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 15.5 10.1 4.9c.7-1.2 2.4-1.2 3.1 0L19.5 16c.7 1.2-.2 2.7-1.6 2.7H6.2c-1.9 0-3.1-1.7-2.2-3.2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="m8.4 15.1 3-5.2 3 5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="block leading-none">
        <span className={`block text-[19px] font-[850] tracking-[-.065em] ${inverse ? "text-white" : "text-[#28253d]"}`}>
          project<span className="text-[#7668ed]">flow</span>
        </span>
        <span className={`mt-1.5 block text-[9px] font-[800] uppercase tracking-[.17em] ${inverse ? "text-white/45" : "text-[#a09bb5]"}`}>
          Your team&apos;s space
        </span>
      </span>
    </Link>
  );
}

function DashboardPreview() {
  const boardTasks = [
    { title: "Plan the next release", label: "Planning", color: "bg-[#ece8ff] text-[#6c5bdc]", owner: "AM", status: "To do" },
    { title: "Connect project APIs", label: "Development", color: "bg-[#e4f5ed] text-[#2e8a68]", owner: "SK", status: "In progress" },
    { title: "Review responsive layout", label: "Design", color: "bg-[#fff0dc] text-[#ae762b]", owner: "RK", status: "Review" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[650px]">
      <div aria-hidden="true" className="absolute -left-10 top-12 h-44 w-44 rounded-full bg-[#cfc8ff]/70 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-5 bottom-4 h-40 w-40 rounded-full bg-[#c8f2df]/70 blur-3xl" />
      <div className="absolute -right-2 top-8 hidden rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-[0_12px_35px_rgba(51,42,118,.12)] sm:block">
        <div className="flex items-center gap-2 text-[10px] font-[800] text-[#4d466d]"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#e7f8f0] text-[#26966e]"><Check size={13} /></span> Progress feels visible</div>
      </div>
      <div className="relative rotate-[.3deg] rounded-[25px] border border-white bg-white/90 p-2.5 shadow-[0_35px_100px_rgba(57,43,130,.18)] backdrop-blur sm:rounded-[30px] sm:p-3.5">
        <div className="overflow-hidden rounded-[19px] border border-[#efedf6] bg-[#fbfaff] sm:rounded-[23px]">
          <div className="flex h-12 items-center justify-between border-b border-[#eeecf5] bg-white px-3.5 sm:h-[58px] sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#f0edff] text-[#6557e8]"><LayoutDashboard size={15} /></span>
              <div><div className="text-[10px] font-[850] text-[#333047] sm:text-[11px]">Workspace overview</div><div className="mt-1 text-[8px] text-[#aaa6ba] sm:text-[9px]">A clearer view of your work</div></div>
            </div>
            <span className="rounded-full border border-[#e9e5ff] bg-[#f6f4ff] px-2.5 py-1 text-[8px] font-[850] tracking-[.07em] text-[#7466df]">PRODUCT PREVIEW</span>
          </div>
          <div className="grid grid-cols-[72px_minmax(0,1fr)] sm:grid-cols-[124px_minmax(0,1fr)]">
            <aside className="border-r border-[#eeecf5] bg-white px-2 py-3 sm:px-3.5 sm:py-4">
              <div className="mb-2 px-1.5 text-[7px] font-[850] uppercase tracking-[.13em] text-[#c0bdcd] sm:mb-3 sm:px-2 sm:text-[8px]">Workspace</div>
              <div className="flex items-center gap-1.5 rounded-[8px] bg-[#f0edff] px-1.5 py-2 text-[8px] font-[800] text-[#6557e8] sm:gap-2 sm:rounded-[10px] sm:px-2.5 sm:text-[9px]"><LayoutDashboard size={11} /><span>Overview</span></div>
              <div className="mt-1.5 flex items-center gap-1.5 rounded-[8px] px-1.5 py-2 text-[8px] font-[650] text-[#918da4] sm:gap-2 sm:rounded-[10px] sm:px-2.5 sm:text-[9px]"><FolderKanban size={11} /><span>Projects</span></div>
              <div className="mt-1.5 flex items-center gap-1.5 rounded-[8px] px-1.5 py-2 text-[8px] font-[650] text-[#918da4] sm:gap-2 sm:rounded-[10px] sm:px-2.5 sm:text-[9px]"><ListChecks size={11} /><span>My tasks</span></div>
              <div className="mt-5 border-t border-[#f0eef6] pt-3 sm:mt-7 sm:pt-4">
                <div className="mb-2 px-1.5 text-[7px] font-[850] uppercase tracking-[.13em] text-[#c0bdcd] sm:px-2 sm:text-[8px]">Projects</div>
                <div className="flex items-center gap-1.5 px-1.5 py-2 text-[8px] text-[#88849b] sm:gap-2 sm:px-2 sm:text-[9px]"><span className="h-2 w-2 shrink-0 rounded-[3px] bg-[#9b8cf7]" />Launch plan</div>
                <div className="flex items-center gap-1.5 px-1.5 py-2 text-[8px] text-[#88849b] sm:gap-2 sm:px-2 sm:text-[9px]"><span className="h-2 w-2 shrink-0 rounded-[3px] bg-[#69c8a6]" />Website refresh</div>
                <div className="hidden items-center gap-2 px-2 py-2 text-[9px] text-[#88849b] sm:flex"><span className="h-2 w-2 rounded-[3px] bg-[#efbd72]" />Q4 planning</div>
              </div>
              <div className="mt-6 hidden rounded-xl bg-[#f7f5ff] p-2.5 sm:block"><Sparkles size={13} className="text-[#7667e7}" /><p className="mt-2 text-[8px] font-[800] text-[#4a4565]">Keep it moving</p><p className="mt-1 text-[8px] leading-4 text-[#9893b4]">Small steps add up.</p></div>
            </aside>
            <div className="min-w-0 p-3 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-[8px] font-[700] tracking-[.08em] text-[#a4a0b5] sm:text-[9px]">YOUR WORKSPACE AT A GLANCE</p><h3 className="mt-1.5 text-[15px] font-[850] tracking-[-.055em] text-[#2d2944] sm:text-[21px]">Good work, in motion.</h3><p className="mt-1 hidden text-[9px] text-[#9692a8] sm:block">Your projects, tasks, and next steps.</p></div>
                <div className="flex -space-x-1.5 pt-1"><span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#fbfaff] bg-[#e4dfff] text-[7px] font-[850] text-[#6557c7] sm:h-7 sm:w-7">AM</span><span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#fbfaff] bg-[#d9f4e9] text-[7px] font-[850] text-[#2f8e70] sm:h-7 sm:w-7">SK</span><span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#fbfaff] bg-[#ffe9ce] text-[7px] font-[850] text-[#ad6e20] sm:h-7 sm:w-7">+2</span></div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3">
                {[{ label: "Projects", value: "08", icon: FolderKanban, tone: "text-[#7668e8]" }, { label: "In progress", value: "24", icon: Clock3, tone: "text-[#d39b47]" }, { label: "Completed", value: "76%", icon: CheckCircle2, tone: "text-[#36a57d]" }].map((stat) => { const Icon = stat.icon; return <div key={stat.label} className="rounded-[11px] border border-[#efedf6] bg-white p-2 sm:rounded-[14px] sm:p-3.5"><div className="flex items-center gap-1 text-[7px] font-[700] text-[#a09cb0] sm:gap-1.5 sm:text-[9px]"><Icon size={11} className={stat.tone} />{stat.label}</div><div className="mt-2 text-[17px] font-[850] tracking-[-.06em] text-[#302c47] sm:mt-3 sm:text-[22px]">{stat.value}</div><div className="mt-1 hidden text-[8px] text-[#9e9aae] sm:block">Example data</div></div>; })}
              </div>
              <div className="mt-3 rounded-[12px] border border-[#efedf6] bg-white p-3 sm:mt-4 sm:rounded-[15px] sm:p-4">
                <div className="flex items-center justify-between gap-2"><div className="text-[9px] font-[850] text-[#3c3854] sm:text-[10px]">Task overview</div><span className="text-[8px] font-[750] text-[#9a96ad]">Sample board</span></div>
                <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
                  {boardTasks.map((task) => <div key={task.title} className="flex items-center gap-2 rounded-[10px] border border-[#f0eef6] bg-[#fdfcff] px-2.5 py-2.5 sm:px-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] bg-[#f0edff] text-[#6e5de4]"><Check size={12} /></span><div className="min-w-0 flex-1"><div className="truncate text-[8px] font-[800] text-[#57516f] sm:text-[9px]">{task.title}</div><div className="mt-1 text-[7px] text-[#aaa6b8] sm:text-[8px]">{task.label}</div></div><span className={`hidden rounded-md px-2 py-1 text-[7px] font-[800] sm:inline-flex ${task.color}`}>{task.status}</span><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0eef7] text-[7px] font-[850] text-[#77718f]">{task.owner}</span></div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-4 left-2 hidden items-center gap-3 rounded-2xl border border-white bg-white/95 px-4 py-3 shadow-[0_16px_45px_rgba(49,38,108,.12)] backdrop-blur sm:flex"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e7f8f0] text-[#28966f]"><CheckCircle2 size={18} /></span><span><span className="block text-[10px] font-[850] text-[#38344f]">Small steps add up</span><span className="mt-1 block text-[9px] text-[#9995aa]">Keep the next action in view.</span></span></div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main id="top" className="min-h-screen overflow-hidden bg-[#fbfaff] text-[#242237]">
      <header className="sticky top-0 z-50 border-b border-[#eeecf5]/90 bg-[#fbfaff]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6 lg:h-[82px] lg:px-8">
          <Brand />
          <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-[12px] font-[750] text-[#77738c] transition hover:text-[#5e50d6]">Features</Link>
            <Link href="#workflow" className="text-[12px] font-[750] text-[#77738c] transition hover:text-[#5e50d6]">How it works</Link>
            <Link href="#faq" className="text-[12px] font-[750] text-[#77738c] transition hover:text-[#5e50d6]">FAQ</Link>
          </nav>
          <div className="hidden items-center gap-2.5 md:flex">
            <Link href="/login" className="rounded-xl px-4 py-2.5 text-[12px] font-[800] text-[#656179] transition hover:bg-white hover:text-[#28253d]">Sign in</Link>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-[#6557e8] px-4 py-2.5 text-[12px] font-[850] text-white shadow-[0_7px_17px_rgba(101,87,232,.2)] transition hover:-translate-y-0.5 hover:bg-[#5546d2]">Get started <ArrowUpRight size={15} /></Link>
          </div>
          <details className="group relative md:hidden">
            <summary aria-label="Open navigation menu" className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-[#eae7f4] bg-white text-[#5b5575] [&::-webkit-details-marker]:hidden"><Menu size={19} /><span className="sr-only">Toggle navigation</span></summary>
            <div className="absolute right-0 top-12 w-[min(86vw,320px)] rounded-2xl border border-[#e9e6f2] bg-white p-3 shadow-[0_20px_55px_rgba(37,29,89,.16)]">
              <Link href="#features" className="block rounded-xl px-3 py-3 text-[13px] font-[750] text-[#716c86] hover:bg-[#f8f7fd]">Features</Link>
              <Link href="#workflow" className="block rounded-xl px-3 py-3 text-[13px] font-[750] text-[#716c86] hover:bg-[#f8f7fd]">How it works</Link>
              <Link href="#faq" className="block rounded-xl px-3 py-3 text-[13px] font-[750] text-[#716c86] hover:bg-[#f8f7fd]">FAQ</Link>
              <div className="my-2 border-t border-[#efedf5]" />
              <Link href="/login" className="block rounded-xl px-3 py-3 text-[13px] font-[800] text-[#4c4762] hover:bg-[#f8f7fd]">Sign in</Link>
              <Link href="/register" className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-[#6557e8] px-3 py-3 text-[13px] font-[850] text-white hover:bg-[#5546d2]">Get started <ArrowRight size={15} /></Link>
            </div>
          </details>
        </div>
      </header>

      <section className="relative isolate px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden"><div className="absolute left-1/2 top-[-300px] h-[650px] w-[950px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(193,184,255,.4),rgba(251,250,255,0)_69%)]" /><div className="absolute right-[-160px] top-[250px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(182,240,218,.35),rgba(251,250,255,0)_68%)]" /><div className="absolute left-[-170px] top-[440px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(255,220,184,.27),rgba(251,250,255,0)_68%)]" /></div>
        <div className="mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[.9fr_1.1fr] lg:gap-10 xl:gap-14">
          <div className="relative z-10 mx-auto w-full max-w-[560px] text-center lg:mx-0 lg:text-left">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#e8e3ff] bg-white/85 px-3.5 py-2 text-[10px] font-[850] text-[#7164c9] shadow-[0_5px_18px_rgba(72,56,158,.05)] sm:text-[11px] lg:mx-0"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f0edff] text-[#7766e9]"><Sparkles size={12} /></span>One calm place for your team&apos;s work</div>
            <h1 className="text-[42px] font-[900] leading-[1.04] tracking-[-.075em] text-[#29263e] sm:text-[55px] md:text-[63px] lg:text-[55px] xl:text-[66px]">Turn your plans into <span className="relative inline-block text-[#6557e8]">real progress<span aria-hidden="true" className="absolute -bottom-1 left-1 right-1 h-[5px] rounded-full bg-[#c9c2ff]/80 sm:h-[6px]" />.</span></h1>
            <p className="mx-auto mt-6 max-w-[500px] text-[14px] leading-7 text-[#77738d] sm:text-[16px] sm:leading-8 lg:mx-0 lg:text-[15px] xl:text-[16px]">Projects, tasks, teammates, and notes — connected in one focused workspace. Spend less time chasing updates and more time moving work forward.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/register" className="group inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] bg-[#6557e8] px-6 text-[13px] font-[850] text-white shadow-[0_10px_22px_rgba(101,87,232,.23)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#5546d2]">Create your free workspace <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></Link>
              <Link href="#preview" className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] border border-[#e6e2f1] bg-white/80 px-6 text-[13px] font-[850] text-[#57526f] transition hover:border-[#d4cdf8] hover:bg-white">See the workspace <ChevronRight size={15} /></Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-[700] text-[#9691a8] lg:justify-start"><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-[#43a984]" /> Projects in one place</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-[#43a984]" /> Clear task ownership</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-[#43a984]" /> Team visibility</span></div>
            <div className="mt-9 border-t border-[#ebe8f5] pt-5"><p className="text-[9px] font-[850] uppercase tracking-[.16em] text-[#aca7bd]">A practical home for</p><div className="mt-3 flex flex-wrap justify-center gap-2 lg:justify-start"><span className="rounded-full border border-[#eae6f4] bg-white/80 px-3 py-1.5 text-[10px] font-[750] text-[#77718d]">Team projects</span><span className="rounded-full border border-[#eae6f4] bg-white/80 px-3 py-1.5 text-[10px] font-[750] text-[#77718d]">Product launches</span><span className="rounded-full border border-[#eae6f4] bg-white/80 px-3 py-1.5 text-[10px] font-[750] text-[#77718d]">Personal goals</span><span className="rounded-full border border-[#eae6f4] bg-white/80 px-3 py-1.5 text-[10px] font-[750] text-[#77718d]">Study plans</span></div></div>
          </div>
          <DashboardPreview />
        </div>
      </section>

      <section className="border-y border-[#eeecf5] bg-white/80 px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1160px] grid-cols-2 gap-5 sm:grid-cols-4 sm:gap-4">
          {[{ icon: FolderKanban, title: "Projects", detail: "Goals and context" }, { icon: ListChecks, title: "Tasks", detail: "Work and next steps" }, { icon: Users, title: "Team", detail: "People and ownership" }, { icon: MessageSquareText, title: "Notes", detail: "Decisions and details" }].map((item) => { const Icon = item.icon; return <div key={item.title} className="flex items-center justify-center gap-3 sm:justify-start"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#f1eeff] text-[#6d5ce1]"><Icon size={17} /></span><span><span className="block text-[12px] font-[850] text-[#39354f]">{item.title}</span><span className="mt-1 block text-[10px] text-[#9994aa]">{item.detail}</span></span></div>; })}
        </div>
      </section>

      <section id="features" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-[1240px]">
          <div className="mx-auto max-w-[680px] text-center"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#e8e3ff] bg-white px-3 py-1.5 text-[9px] font-[850] uppercase tracking-[.13em] text-[#7568d6]"><Zap size={12} />Less busywork, more momentum</div><h2 className="text-[32px] font-[900] leading-[1.12] tracking-[-.065em] text-[#2a2740] sm:text-[43px]">Everything your project needs to move forward.</h2><p className="mx-auto mt-4 max-w-[570px] text-[13px] leading-7 text-[#858198] sm:text-[15px]">A useful workspace should make the work easier to understand — not add another system to maintain.</p></div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:mt-14 xl:grid-cols-4">{features.map((feature) => { const Icon = feature.icon; const tones = { violet: "bg-[#f0edff] text-[#6b5be0]", blue: "bg-[#eaf2ff] text-[#497bd0]", green: "bg-[#e7f8f0] text-[#258f69]", amber: "bg-[#fff2df] text-[#b57b2c]" }; return <article key={feature.number} className="group relative overflow-hidden rounded-[22px] border border-[#efedf6] bg-white p-6 shadow-[0_8px_28px_rgba(47,35,112,.025)] transition duration-300 hover:-translate-y-1 hover:border-[#dcd5ff] hover:shadow-[0_18px_45px_rgba(47,35,112,.08)] sm:p-7"><div className="flex items-center justify-between"><span className={`flex h-12 w-12 items-center justify-center rounded-[16px] ${tones[feature.tone]}`}><Icon size={21} /></span><span className="text-[10px] font-[850] tracking-[.12em] text-[#d0cbdc]">{feature.number}</span></div><h3 className="mt-6 text-[17px] font-[900] tracking-[-.035em] text-[#35314a]">{feature.title}</h3><p className="mt-3 min-h-[82px] text-[12px] leading-6 text-[#858198]">{feature.description}</p><div className="mt-5 space-y-2 border-t border-[#f0eef6] pt-4">{feature.bullets.map((bullet) => <div key={bullet} className="flex items-center gap-2 text-[10px] font-[750] text-[#77728b]"><CheckCircle2 size={13} className="text-[#48ae87]" />{bullet}</div>)}</div></article>; })}</div>
        </div>
      </section>

      <section className="border-y border-[#eeecf5] bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-[1160px] items-center gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
          <div><div className="eyebrow mb-3">The view you need</div><h2 className="max-w-[520px] text-[32px] font-[900] leading-[1.12] tracking-[-.065em] text-[#2a2740] sm:text-[43px]">Less wondering. More knowing what comes next.</h2><p className="mt-5 max-w-[480px] text-[13px] leading-7 text-[#858198] sm:text-[15px]">A quick glance should help you answer the important questions: what are we working on, who owns it, and what needs attention?</p><div className="mt-7 space-y-4">{[{ icon: CheckCircle2, title: "Progress stays visible", text: "Understand task status without digging through long updates." }, { icon: Users, title: "Ownership stays clear", text: "Keep tasks and teammates connected to the project." }, { icon: CalendarDays, title: "Context stays close", text: "Keep useful notes where your team is already working." }].map((item) => { const Icon = item.icon; return <div key={item.title} className="flex items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0edff] text-[#6c5be0]"><Icon size={16} /></span><div><h3 className="text-[12px] font-[850] text-[#3d3854]">{item.title}</h3><p className="mt-1 text-[11px] leading-5 text-[#918ca3]">{item.text}</p></div></div>; })}</div><Link href="/register" className="group mt-8 inline-flex items-center gap-2 text-[12px] font-[850] text-[#6557e8] hover:text-[#4f41c7]">Start organizing your work <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></Link></div>
          <div className="relative overflow-hidden rounded-[26px] border border-[#eae6f5] bg-[#f9f8fe] p-4 shadow-[0_20px_65px_rgba(45,35,111,.08)] sm:rounded-[30px] sm:p-6"><div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#dcd6ff]/65 blur-3xl" /><div className="relative"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-[850] uppercase tracking-[.14em] text-[#a29db6]">Example project</p><h3 className="mt-1.5 text-[19px] font-[900] tracking-[-.04em] text-[#34304a]">Website refresh</h3></div><span className="rounded-full bg-[#e6f7ef] px-3 py-1.5 text-[9px] font-[850] text-[#2d8b68]">In progress</span></div><div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">{[{ label: "To do", count: "04", color: "#7463de", bg: "#efecff" }, { label: "In progress", count: "07", color: "#b17929", bg: "#fff1dd" }, { label: "Done", count: "12", color: "#278a67", bg: "#e4f6ed" }].map((status) => <div key={status.label} className="rounded-[14px] border border-white bg-white/90 p-3 sm:p-4"><p className="text-[9px] font-[750] text-[#928da4]">{status.label}</p><p className="mt-2 text-[25px] font-[900] tracking-[-.06em]" style={{ color: status.color }}>{status.count}</p></div>)}</div><div className="mt-4 rounded-[17px] border border-white bg-white/95 p-4 sm:p-5"><div className="flex items-center justify-between"><h4 className="text-[11px] font-[850] text-[#3f3a55]">Team task board</h4><span className="text-[9px] text-[#a19bb1]">Sample preview</span></div><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">{[{ title: "To do", count: "2 tasks", dot: "bg-[#8e81ed]", cards: [{ title: "Outline key pages", tag: "Planning" }, { title: "Collect feedback", tag: "Research" }] }, { title: "In progress", count: "1 task", dot: "bg-[#e2ae5c]", cards: [{ title: "Build responsive UI", tag: "Frontend" }] }, { title: "Done", count: "2 tasks", dot: "bg-[#69bf9c]", cards: [{ title: "Set up repository", tag: "Setup" }, { title: "Define project goals", tag: "Planning" }] }].map((column) => <div key={column.title} className="min-w-0 rounded-[13px] bg-[#faf9fd] p-2.5"><div className="mb-2.5 flex items-center justify-between gap-1"><span className="flex items-center gap-1.5 text-[9px] font-[850] text-[#625d77]"><span className={`h-1.5 w-1.5 rounded-full ${column.dot}`} />{column.title}</span><span className="text-[8px] text-[#aaa5b8]">{column.count}</span></div>{column.cards.map((card) => <div key={card.title} className="mb-2 rounded-[10px] border border-[#eeecf5] bg-white p-2.5 last:mb-0"><div className="text-[8px] font-[800] leading-4 text-[#5c5673]">{card.title}</div><div className="mt-2 inline-flex rounded-md bg-[#f1eeff] px-1.5 py-1 text-[7px] font-[800] text-[#7668de]">{card.tag}</div></div>)}</div>)}</div></div><div className="mt-4 flex items-center gap-2 rounded-[13px] border border-white bg-white/80 px-3 py-2.5 text-[9px] font-[750] text-[#817b97]"><Sparkles size={13} className="text-[#7666e8]" /> Keep plans, tasks, and people connected.</div></div></div>
        </div>
      </section>

      <section id="workflow" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-[1160px]"><div className="mx-auto max-w-[650px] text-center"><div className="eyebrow mb-3">Simple by design</div><h2 className="text-[32px] font-[900] leading-[1.12] tracking-[-.065em] text-[#2a2740] sm:text-[43px]">A better rhythm in three steps.</h2><p className="mt-4 text-[13px] leading-7 text-[#858198] sm:text-[15px]">No complicated rollout needed. Start small, keep the work visible, and build from there.</p></div><div className="relative mt-12 grid gap-4 md:grid-cols-3 md:gap-5">{steps.map((step, index) => { const Icon = step.icon; return <article key={step.number} className="relative rounded-[22px] border border-[#efedf6] bg-white p-6 sm:p-7"><div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#f0edff] text-[#6a5ae1]"><Icon size={21} /></span><span className="text-[12px] font-[900] tracking-[.12em] text-[#d0cbdc]">{step.number}</span></div><h3 className="mt-6 text-[16px] font-[900] tracking-[-.025em] text-[#34304b]">{step.title}</h3><p className="mt-3 text-[12px] leading-6 text-[#89859b]">{step.description}</p>{index < steps.length - 1 && <MoveRight size={18} className="absolute -right-4 top-11 z-10 hidden text-[#c8c2ec] md:block" />}</article>; })}</div></div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8 lg:pb-28">
        <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[28px] bg-[#29253f] px-6 py-10 text-white shadow-[0_24px_65px_rgba(43,34,103,.17)] sm:rounded-[34px] sm:px-10 sm:py-14 lg:px-16 lg:py-16"><div aria-hidden="true" className="absolute inset-0 soft-grid opacity-[.14]" /><div aria-hidden="true" className="absolute -right-24 -top-40 h-[440px] w-[440px] rounded-full border border-white/10" /><div aria-hidden="true" className="absolute -right-3 -top-20 h-[300px] w-[300px] rounded-full border border-white/10" /><div aria-hidden="true" className="absolute -bottom-36 left-[35%] h-[330px] w-[330px] rounded-full bg-[#6557e8]/45 blur-[75px]" /><div className="relative z-10 grid gap-9 lg:grid-cols-[1fr_auto] lg:items-end"><div className="max-w-[700px]"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-3 py-1.5 text-[10px] font-[850] text-[#c8c1ff]"><Zap size={12} /> Make the next step clear</div><h2 className="text-[32px] font-[900] leading-[1.1] tracking-[-.065em] sm:text-[44px] lg:text-[50px]">Your next good idea deserves a clear path.</h2><p className="mt-4 max-w-[570px] text-[12px] leading-7 text-white/60 sm:text-[14px]">Set up a workspace, bring your work together, and turn the plan into progress — one step at a time.</p><div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-[700] text-white/65 sm:text-[11px]"><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-[#8ce0bd]" /> Projects and tasks</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-[#8ce0bd]" /> Shared context</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} className="text-[#8ce0bd]" /> Progress in view</span></div></div><div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><Link href="/register" className="inline-flex min-h-[49px] items-center justify-center gap-2 rounded-[13px] bg-white px-5 text-[12px] font-[900] text-[#4f43c9] transition hover:-translate-y-0.5 hover:bg-[#f1efff]">Create your workspace <ArrowRight size={15} /></Link><Link href="/login" className="inline-flex min-h-[49px] items-center justify-center gap-2 rounded-[13px] border border-white/15 bg-white/[.05] px-5 text-[12px] font-[850] text-white transition hover:bg-white/10">I already have an account <ArrowUpRight size={14} /></Link></div></div></div>
      </section>

      <section id="faq" className="scroll-mt-24 border-t border-[#eeecf5] bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-[1080px] gap-10 lg:grid-cols-[.78fr_1.22fr] lg:gap-20"><div><div className="eyebrow mb-3">A few helpful answers</div><h2 className="text-[30px] font-[900] leading-[1.12] tracking-[-.06em] text-[#2a2740] sm:text-[39px]">Questions before you get started?</h2><p className="mt-4 max-w-[390px] text-[12px] leading-7 text-[#89859b] sm:text-[14px]">A few quick notes about what ProjectFlow is built to help you do.</p><div className="mt-6 inline-flex items-center gap-2 text-[11px] font-[750] text-[#89849f]"><CircleHelp size={15} className="text-[#8d80e9]" /> Need help? Check the project README.</div></div><div className="space-y-3">{faqs.map((faq, index) => <details key={faq.question} className="group rounded-[17px] border border-[#ece9f5] bg-[#fdfcff] p-4 open:border-[#ded8ff] sm:p-5" open={index === 0}><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[12px] font-[850] text-[#3b3653] [&::-webkit-details-marker]:hidden sm:text-[13px]">{faq.question}<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f4f2ff] text-[#7869e3]"><ChevronRight size={14} className="transition-transform group-open:rotate-90" /></span></summary><p className="mt-3 max-w-[610px] text-[11px] leading-6 text-[#89859b] sm:text-[12px]">{faq.answer}</p></details>)}</div></div>
      </section>

      <footer className="border-t border-[#eeecf5] bg-[#fbfaff] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-7 sm:flex-row sm:items-center sm:justify-between"><div><Brand /><p className="mt-4 max-w-[320px] text-[11px] leading-5 text-[#9691a8]">A focused workspace for organizing projects, tracking tasks, and keeping people aligned.</p></div><div className="grid grid-cols-2 gap-x-10 gap-y-3 text-[11px] font-[750] text-[#858098] sm:flex sm:items-center sm:gap-6"><Link href="#features" className="transition hover:text-[#6557e8]">Features</Link><Link href="#workflow" className="transition hover:text-[#6557e8]">How it works</Link><Link href="#faq" className="transition hover:text-[#6557e8]">FAQ</Link><Link href="/login" className="transition hover:text-[#6557e8]">Sign in</Link><Link href="/register" className="transition hover:text-[#6557e8]">Create account</Link></div></div><div className="mx-auto mt-7 flex max-w-[1240px] flex-col gap-2 border-t border-[#eeecf5] pt-5 text-[10px] text-[#aaa5b8] sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} ProjectFlow. Built to help good work move forward.</span><Link href="#top" className="inline-flex items-center gap-1 hover:text-[#6557e8]">Back to top <ArrowUpRight size={12} /></Link></div>
      </footer>
    </main>
  );
}
