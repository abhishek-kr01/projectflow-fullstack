"use client";

import { useEffect } from "react";
import { Check, CircleAlert, Info, X } from "lucide-react";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dimension = size === "lg" ? "h-12 w-12 rounded-[16px]" : size === "sm" ? "h-8 w-8 rounded-[11px]" : "h-10 w-10 rounded-[13px]";
  const iconSize = size === "lg" ? 25 : size === "sm" ? 17 : 21;
  return <div className={`${dimension} flex items-center justify-center bg-[#6557e8] text-white shadow-[0_6px_15px_rgba(101,87,232,.23)]`}><svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 15.5 10.1 4.9c.7-1.2 2.4-1.2 3.1 0L19.5 16c.7 1.2-.2 2.7-1.6 2.7H6.2c-1.9 0-3.1-1.7-2.2-3.2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="m8.4 15.1 3-5.2 3 5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>;
}

export function Avatar({ name, src, size = "md" }: { name?: string; src?: string; size?: "xs" | "md" | "lg" }) {
  const initials = (name || "U").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const dimensions = size === "xs" ? "avatar avatar-xs" : size === "lg" ? "avatar avatar-lg" : "avatar";
  return <span className={dimensions}>{src && src.startsWith("http") ? <img src={src} alt={name || "User avatar"} /> : initials}</span>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="min-w-0">{eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}<h1 className="text-[25px] font-[780] tracking-[-.045em] text-[#242237] sm:text-[29px]">{title}</h1>{description && <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-[#6e6d80]">{description}</p>}</div>{action && <div className="shrink-0">{action}</div>}</div>;
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3" aria-label="Loading"><div className="skeleton h-8 w-1/3" />{Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-[66px] w-full" />)}</div>;
}

export function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3 className="text-[14px] font-[750] text-[#302d46]">{title}</h3><p className="mt-2 max-w-[330px] text-[12px] leading-5 text-[#706d7f]">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function Modal({ open, onClose, title, description, children, width }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal" style={width ? { maxWidth: width } : undefined} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="flex items-start justify-between gap-3 border-b border-[#f0eef6] px-5 py-5 sm:px-6"><div><h2 id="modal-title" className="text-[17px] font-[780] tracking-[-.025em]">{title}</h2>{description && <p className="mt-1.5 text-[12px] leading-5 text-[#706d7f]">{description}</p>}</div><button type="button" className="icon-btn h-8 w-8 shrink-0" onClick={onClose} aria-label="Close dialog"><X size={16}/></button></div><div className="p-5 sm:p-6">{children}</div></div></div>;
}

export type ToastMessage = { type: "success" | "error" | "info"; message: string } | null;
export function Toast({ value, onDismiss }: { value: ToastMessage; onDismiss: () => void }) {
  useEffect(() => { if (!value) return; const timer = window.setTimeout(onDismiss, 4200); return () => window.clearTimeout(timer); }, [value, onDismiss]);
  if (!value) return null;
  const Icon = value.type === "success" ? Check : value.type === "error" ? CircleAlert : Info;
  return <div className="toast" role="status"><Icon size={17} className={value.type === "error" ? "text-[#ff9dab]" : value.type === "success" ? "text-[#7ce0b8]" : "text-[#c5bcff]"}/><div className="flex-1 text-[12px] leading-5">{value.message}</div><button onClick={onDismiss} aria-label="Dismiss notification" className="ml-1 text-white/60 hover:text-white"><X size={15}/></button></div>;
}

export function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex items-start gap-2 rounded-xl border border-[#f2d9df] bg-[#fff7f8] px-3.5 py-3 text-[12px] leading-5 text-[#ae4356]"><CircleAlert size={15} className="mt-0.5 shrink-0"/><span>{children}</span></div>;
}
