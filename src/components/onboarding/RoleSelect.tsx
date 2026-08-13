"use client";

import { useState, useTransition } from "react";
import { setRoleAction } from "@/app/onboarding/actions";
import { interactive } from "@/components/ui";
import { cn } from "@/lib/cn";

type SelfServiceUserRole = "candidate" | "employer";

const OPTIONS: {
  role: SelfServiceUserRole;
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

export function RoleSelect({
  preselect,
  next,
}: {
  preselect?: string;
  next?: string;
}) {
  const [selected, setSelected] = useState<SelfServiceUserRole | null>(
    preselect === "employer" || preselect === "candidate" ? preselect : null,
  );
  const [pending, startTransition] = useTransition();

  function choose(role: SelfServiceUserRole) {
    setSelected(role);
    startTransition(() => setRoleAction(role, next));
  }

  return (
    <div className="space-y-3">
      {OPTIONS.map((o) => (
        <button
          key={o.role}
          type="button"
          onClick={() => choose(o.role)}
          disabled={pending}
          className={cn(
            "flex w-full items-start gap-4 rounded-2xl border-2 bg-surface p-5 text-left",
            interactive,
            selected === o.role
              ? "border-brand ring-2 ring-brand/20"
              : "border-border hover:border-brand/40",
          )}
        >
          <span aria-hidden="true" className="text-3xl">
            {o.icon}
          </span>
          <span>
            <span className="block text-lg font-bold">{o.title}</span>
            <span className="block text-sm text-muted">{o.text}</span>
          </span>
        </button>
      ))}
      {pending && (
        <p className="text-center text-sm text-muted">
          Setting up your account…
        </p>
      )}
    </div>
  );
}
