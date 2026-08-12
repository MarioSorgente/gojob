import Link from "next/link";
import type { Job } from "@/lib/types";
import { formatSalaryRange } from "@/lib/cn";
import { Badge } from "../ui";
import { MatchPercent, ReasonList } from "./match";

export function JobCard({
  job,
  score,
  reasons,
  href,
}: {
  job: Job;
  score?: number;
  reasons?: string[];
  href?: string;
}) {
  const inner = (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold leading-tight">{job.role}</h3>
          <p className="text-sm text-muted">{job.businessName}</p>
        </div>
        {score != null && <MatchPercent score={score} />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        {job.businessVerified ? (
          <Badge tone="green">✓ Verified</Badge>
        ) : (
          <Badge tone="slate">Unverified</Badge>
        )}
        <span>📍 {job.area}</span>
        <span>· {job.employmentType}</span>
      </div>
      <p className="mt-2 font-semibold text-slate-800">
        💰 {formatSalaryRange(job.salaryType, job.salaryMin, job.salaryMax) || "—"}
      </p>
      {reasons && reasons.length > 0 && (
        <div className="mt-3">
          <ReasonList reasons={reasons} limit={3} />
        </div>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
