"use client";

import { useState, useTransition } from "react";
import { setRoleAction } from "@/app/onboarding/actions";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/cn";

const OPTIONS: {
  role: Exclude<UserRole, "admin">;
  icon: string;
  title: string;
  text: string;
}[] = [
  {
    role: "employer",
    icon: "🏝️",
    title: "I'm hiring",
    text: "A café, restaurant, bar, hotel or beach club looking for staff.",
  },
  {
    role: "candidate",
    icon: "🙋",
    title: "I'm looking for work",
    text: "Find hospitality jobs across Bali. Always free.",
  },
];

export function RoleSelect({ preselect }: { preselect?: string }) {
  const [selected, setSelected] = useState<UserRole | null>(
    preselect === "employer" || preselect === "candidate" ? preselect : null,
  );
  const [pending, startTransition] = useTransition();

  function choose(role: UserRole) {
    setSelected(role);
    startTransition(() => setRoleAction(role));
  }

  return (
    <div className="space-y-3">
      {OPTIONS.map((o) => (
        <button
          key={o.role}
          onClick={() => choose(o.role)}
          disabled={pending}
          className={cn(
            "flex w-full items-start gap-4 rounded-2xl border-2 bg-surface p-5 text-left transition-colors disabled:opacity-60",
            selected === o.role
              ? "border-brand ring-2 ring-brand/20"
              : "border-border hover:border-brand/40",
          )}
        >
          <span className="text-3xl">{o.icon}</span>
          <span>
            <span className="block text-lg font-bold">{o.title}</span>
            <span className="block text-sm text-muted">{o.text}</span>
          </span>
        </button>
      ))}
      {pending && (
        <p className="text-center text-sm text-muted">Setting up your account…</p>
      )}
    </div>
  );
}
