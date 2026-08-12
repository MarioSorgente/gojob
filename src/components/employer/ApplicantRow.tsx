import type { ReactNode } from "react";
import type { CandidateSummary } from "@/lib/types";
import { Avatar, Badge } from "@/components/ui";
import { MatchPercent } from "@/components/cards/match";

export function ApplicantRow({
  summary,
  score,
  scoreLabel,
  right,
}: {
  summary: CandidateSummary;
  score: number;
  /** When set, the number is labelled (e.g. "profile") instead of a match %. */
  scoreLabel?: string;
  right?: ReactNode;
}) {
  const name = `${summary.firstName} ${summary.lastName}`.trim() || "Candidate";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
      <Avatar name={name} photo={summary.photo} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate font-semibold">{name}</p>
          {scoreLabel ? (
            <Badge tone="slate">
              {score}% {scoreLabel}
            </Badge>
          ) : (
            <MatchPercent score={score} className="text-xs" />
          )}
          {summary.verification.id === "verified" && <Badge tone="green">✓ ID</Badge>}
        </div>
        <p className="truncate text-xs text-muted">
          {summary.primaryRole} · {summary.yearsExperience} yr
          {summary.yearsExperience === 1 ? "" : "s"} · 📍 {summary.area}
        </p>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
