import type { ReactNode } from "react";
import type { CandidateSummary } from "@/lib/types";
import { Avatar } from "@/components/ui";
import { MatchPercent } from "@/components/cards/match";

export function ApplicantRow({
  summary,
  score,
  right,
}: {
  summary: CandidateSummary;
  score: number;
  right?: ReactNode;
}) {
  const name = `${summary.firstName} ${summary.lastName}`.trim() || "Candidate";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
      <Avatar name={name} photo={summary.photo} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold">{name}</p>
          <MatchPercent score={score} className="text-xs" />
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
