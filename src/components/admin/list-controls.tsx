"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Updates one or more query params (dropping `page`) and re-renders the server page. */
export function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    const qs = next.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  };
  return { params, update, pending };
}

export function SearchInput({ placeholder, param = "q" }: { placeholder: string; param?: string }) {
  const { params, update, pending } = useQueryUpdater();
  const [value, setValue] = useState(params.get(param) ?? "");
  return (
    <form
      role="search"
      className="relative flex-1 min-w-[200px] max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        update({ [param]: value.trim() || undefined });
      }}
    >
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (!e.target.value) update({ [param]: undefined });
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn("w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:border-foreground", pending && "opacity-60")}
      />
    </form>
  );
}

export function SelectFilter({ param, options, label }: { param: string; options: { value: string; label: string }[]; label: string }) {
  const { params, update, pending } = useQueryUpdater();
  return (
    <select
      aria-label={label}
      value={params.get(param) ?? ""}
      onChange={(e) => update({ [param]: e.target.value || undefined })}
      className={cn("border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-foreground", pending && "opacity-60")}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Tabs that set a query param (e.g. order status). */
export function FilterTabs({ param, tabs }: { param: string; tabs: { value: string; label: string; count?: number }[] }) {
  const { params, update } = useQueryUpdater();
  const current = params.get(param) ?? "";
  return (
    <div className="flex gap-1 overflow-x-auto hide-scrollbar border-b border-gray-200 mb-4">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => update({ [param]: t.value || undefined })}
          className={cn(
            "px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors",
            current === t.value ? "border-foreground text-foreground font-medium" : "border-transparent text-gray-500 hover:text-foreground"
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 text-xs text-gray-400">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
