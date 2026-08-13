import type { ReactNode } from "react";
import type { CandidateSummary, MatchBreakdown } from "@/lib/types";
import { formatSalaryRange } from "@/lib/cn";
import { Avatar, Badge } from "../ui";
import { MatchPercent, ReasonList } from "./match";
import { MatchExplain } from "./MatchExplain";

export function CandidateCard({
  summary,
  score,
  reasons,
  breakdown,
  footer,
  showReasons = true,
}: {
  summary: CandidateSummary;
  score?: number;
  reasons?: string[];
  /** When present the score becomes tappable and explains itself. */
  breakdown?: MatchBreakdown;
  footer?: ReactNode;
  showReasons?: boolean;
}) {
  const name = `${summary.firstName} ${summary.lastName}`.trim() || "Candidate";
  const langs = summary.languages
    .map((l) => `${l.language} (${l.level})`)
    .join(", ");

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar name={name} photo={summary.photo} size={56} />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold leading-tight">{name}</h3>
            {score != null &&
              (breakdown ? (
                <MatchExplain
                  score={score}
                  breakdown={breakdown}
                  reasons={reasons}
                  audience="employer"
                />
              ) : (
                <MatchPercent score={score} />
              ))}
          </div>
          <p className="text-sm text-muted">
            {summary.primaryRole} · {summary.yearsExperience} yr
            {summary.yearsExperience === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
        <span>📍 {summary.area}</span>
        <span>🟢 {summary.availability.type.replace("Available ", "")}</span>
        <span className="col-span-2 font-semibold text-slate-800">
          💰 {formatSalaryRange(summary.salary.type, summary.salary.min, summary.salary.max) || "—"}
        </span>
        {langs && <span className="col-span-2 text-slate-600">🗣️ {langs}</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {summary.verification.phone === "verified" && <Badge tone="green">✓ Phone</Badge>}
        {summary.verification.id === "verified" && <Badge tone="green">✓ ID</Badge>}
        {summary.verification.employment === "verified" && (
          <Badge tone="green">✓ Employment</Badge>
        )}
      </div>

      {showReasons && reasons && reasons.length > 0 && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            Why GoJob recommends
          </p>
          <ReasonList reasons={reasons} />
        </div>
      )}

      {footer}
    </div>
  );
}
