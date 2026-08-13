import Link from "next/link";
import type { Job, MatchBreakdown } from "@/lib/types";
import { formatSalaryRange } from "@/lib/cn";
import { Badge } from "../ui";
import { MatchPercent, ReasonList } from "./match";
import { MatchExplain } from "./MatchExplain";

export function JobCard({
  job,
  score,
  reasons,
  breakdown,
  href,
}: {
  job: Job;
  score?: number;
  reasons?: string[];
  /** When present the score becomes tappable and explains itself. */
  breakdown?: MatchBreakdown;
  href?: string;
}) {
  return (
    // A "stretched link": the anchor covers the card, and controls that need
    // their own click sit above it. Wrapping the card in <Link> instead would
    // put a <button> inside an <a> — invalid markup that also swallows keyboard
    // activation of the inner control.
    <div className="relative h-full rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all hover:border-brand/40 hover:shadow-md focus-within:ring-2 focus-within:ring-brand/40">
      {href && (
        <Link
          href={href}
          className="absolute inset-0 z-0 rounded-2xl outline-none"
        >
          <span className="sr-only">
            {job.role} at {job.businessName}
          </span>
        </Link>
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 max-w-prose">
          <h3 className="font-bold leading-tight">{job.role}</h3>
          <p className="truncate text-sm text-muted">{job.businessName}</p>
        </div>
        {score != null &&
          (breakdown ? (
            <div className="relative z-10 shrink-0">
              <MatchExplain
                score={score}
                breakdown={breakdown}
                reasons={reasons}
              />
            </div>
          ) : (
            <MatchPercent score={score} className="shrink-0" />
          ))}
      </div>

      <div className="relative mt-2 flex max-w-prose flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        {job.businessVerified ? (
          <Badge tone="green">✓ Verified</Badge>
        ) : (
          <Badge tone="slate">Unverified</Badge>
        )}
        <span>📍 {job.area}</span>
        <span>· {job.employmentType}</span>
      </div>

      <p className="relative mt-2 font-semibold text-slate-800">
        💰{" "}
        {formatSalaryRange(job.salaryType, job.salaryMin, job.salaryMax) || "—"}
      </p>

      {reasons && reasons.length > 0 && (
        <div className="relative mt-3 max-w-prose">
          <ReasonList reasons={reasons} limit={3} />
        </div>
      )}
    </div>
  );
}
