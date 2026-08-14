"use client";

import { useState, useTransition } from "react";
import { setRoleAction } from "@/app/onboarding/actions";
import { Spinner, interactive } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";
import type { DictionaryKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/cn";

type SelfServiceUserRole = "candidate" | "employer";

const OPTIONS: {
  role: SelfServiceUserRole;
  icon: IconName;
  title: DictionaryKey;
  text: DictionaryKey;
}[] = [
  {
    role: "employer",
    icon: "building",
    title: "landing.ctaEmployer",
    text: "employer.jobsSubtitle",
  },
  {
    role: "candidate",
    icon: "user",
    title: "landing.ctaCandidate",
    text: "filter.searchJobsSubtitle",
  },
];

export function RoleSelect({
  preselect,
  next,
}: {
  preselect?: string;
  next?: string;
}) {
  const t = useT();
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
          aria-pressed={selected === o.role}
          className={cn(
            "flex w-full items-start gap-4 rounded-card border-2 bg-surface p-5 text-left",
            interactive,
            selected === o.role
              ? "border-brand ring-2 ring-brand/20"
              : "border-border hover:border-brand/40",
          )}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand-dark">
            <Icon name={o.icon} className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-lg font-bold">{t(o.title)}</span>
            <span className="block text-sm text-muted">{t(o.text)}</span>
          </span>
        </button>
      ))}
      {pending && (
        <p className="flex items-center justify-center gap-2 text-center text-sm text-muted">
          <Spinner />
          {t("common.pleaseWait")}
        </p>
      )}
    </div>
  );
}
