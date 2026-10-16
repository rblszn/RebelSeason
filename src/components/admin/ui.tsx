import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="inline-flex items-center text-sm text-gray-500 hover:text-foreground mb-3">
          <ChevronLeft className="w-4 h-4 mr-1" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ title, actions, children, className }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("bg-white border border-gray-200 rounded-lg", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
          {title && <h2 className="font-medium text-foreground">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone = "default", href }: { label: string; value: string | number; hint?: string; tone?: "default" | "warn"; href?: string }) {
  const body = (
    <div className={cn("bg-white border rounded-lg p-4 h-full", tone === "warn" ? "border-amber-300 bg-amber-50" : "border-gray-200", href && "hover:border-foreground transition-colors")}>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Pill({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "green" | "amber" | "red" | "gold" }) {
  const color = { gray: "bg-gray-100 text-gray-600", green: "bg-green-100 text-green-800", amber: "bg-amber-100 text-amber-800", red: "bg-red-100 text-red-700", gold: "bg-primary/40 text-foreground" }[tone];
  return <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs whitespace-nowrap", color)}>{children}</span>;
}

/** Horizontally scrollable table wrapper for small screens. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">{children}</table>
    </div>
  );
}

export const th = "text-left font-medium text-gray-500 text-xs uppercase tracking-wider px-4 py-3 border-b border-gray-200 bg-gray-50";
export const td = "px-4 py-3 border-b border-gray-100 align-middle";

export const inputCls =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground disabled:bg-gray-50 disabled:text-gray-500";

export function Field({ label, htmlFor, hint, error, children, className }: { label: string; htmlFor?: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={cn("inline-flex items-center gap-2 text-sm cursor-pointer select-none", disabled && "opacity-50 cursor-not-allowed")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative w-9 h-5 rounded-full transition-colors shrink-0", checked ? "bg-foreground" : "bg-gray-300")}
      >
        <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform", checked && "translate-x-4")} />
      </button>
      {label}
    </label>
  );
}
