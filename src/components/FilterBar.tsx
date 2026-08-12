"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Button, Input, Select } from "./ui";
import { cn } from "@/lib/cn";

export interface FilterField {
  name: string;
  label: string;
  type: "select" | "number" | "checkbox";
  options?: readonly string[];
  placeholder?: string;
}

/**
 * URL-driven filter panel. Filters live in the query string so results are
 * shareable, survive refresh, and are read by the server component.
 */
export function FilterBar({
  fields,
  searchPlaceholder = "Search…",
}: {
  fields: FilterField[];
  searchPlaceholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(params.get("q") ?? "");

  const activeCount = fields.filter((f) => params.get(f.name)).length;

  function apply(updates: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  function clearAll() {
    setQuery("");
    router.push(pathname);
  }

  return (
    <div className="mb-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: query });
        }}
        className="flex gap-2"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
        />
        <Button
          type="button"
          variant={activeCount ? "primary" : "outline"}
          onClick={() => setOpen((o) => !o)}
        >
          Filters{activeCount ? ` (${activeCount})` : ""}
        </Button>
      </form>

      {open && (
        <div className="mt-3 space-y-3 rounded-2xl border border-border bg-surface p-4">
          {fields.map((f) => {
            const value = params.get(f.name) ?? "";
            if (f.type === "select") {
              return (
                <label key={f.name} className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">
                    {f.label}
                  </span>
                  <Select
                    value={value}
                    onChange={(e) => apply({ [f.name]: e.target.value })}
                  >
                    <option value="">Any</option>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                </label>
              );
            }
            if (f.type === "number") {
              return (
                <label key={f.name} className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">
                    {f.label}
                  </span>
                  <Input
                    inputMode="numeric"
                    defaultValue={value}
                    placeholder={f.placeholder}
                    onBlur={(e) =>
                      apply({ [f.name]: e.target.value.replace(/[^0-9]/g, "") })
                    }
                  />
                </label>
              );
            }
            return (
              <label key={f.name} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={value === "1"}
                  onChange={(e) => apply({ [f.name]: e.target.checked ? "1" : "" })}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                {f.label}
              </label>
            );
          })}
          <button
            type="button"
            onClick={clearAll}
            className={cn(
              "text-sm font-semibold text-brand",
              !activeCount && !query && "opacity-50",
            )}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
