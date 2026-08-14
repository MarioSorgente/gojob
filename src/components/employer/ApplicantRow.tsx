import type { ReactNode } from "react";
import type { CandidateSummary } from "@/lib/types";
import type { Locale } from "@/lib/i18n/config";
import type { Translate } from "@/lib/i18n/dictionary";
import { areaLabel, roleLabel } from "@/lib/i18n/taxonomy";
import { Avatar, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { MatchPercent } from "@/components/cards/match";

export function ApplicantRow({
  summary,
  score,
  scoreLabel,
  scoreSlot,
  right,
  locale,
  t,
}: {
  summary: CandidateSummary;
  score?: number;
  /** When set, the number is labelled (e.g. "profile") instead of a match %. */
  scoreLabel?: string;
  /** Replaces the score badge — used to make it an interactive explainer. */
  scoreSlot?: ReactNode;
  right?: ReactNode;
  locale: Locale;
  t: Translate;
}) {
  const name = `${summary.firstName} ${summary.lastName}`.trim();
  const years =
    summary.yearsExperience > 1
      ? t("job.experienceMin", { years: summary.yearsExperience })
      : summary.yearsExperience === 1
        ? t("job.experienceMinOne")
        : t("job.experienceNone");

  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 transition-colors hover:border-brand/40">
      <Avatar name={name} photo={summary.photo} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate font-semibold">{name}</p>
          {scoreSlot ??
            (score == null ? null : scoreLabel ? (
              <Badge tone="slate">
                {score}% {scoreLabel}
              </Badge>
            ) : (
              <MatchPercent score={score} className="text-xs" />
            ))}
          {summary.verification.id === "verified" && (
            <Badge tone="green">
              <Icon name="checkBadge" className="h-3 w-3" />
              ID
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted">
          {roleLabel(summary.primaryRole, locale)} · {years} ·{" "}
          {areaLabel(summary.area, locale)}
        </p>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
