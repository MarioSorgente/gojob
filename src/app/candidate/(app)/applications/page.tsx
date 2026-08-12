import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listCandidateApplications } from "@/lib/repos/pipeline";
import { formatSalaryRange } from "@/lib/cn";
import { Card, EmptyState, PageTitle } from "@/components/ui";
import { MatchPercent } from "@/components/cards/match";
import { StageBadge } from "@/components/StageBadge";

export default async function ApplicationsPage() {
  const user = await requireRole("candidate");
  const apps = await listCandidateApplications(user.uid);

  return (
    <>
      <PageTitle title="Your applications" subtitle="Jobs you've applied to" />
      {apps.length === 0 ? (
        <EmptyState
          icon="📄"
          title="No applications yet"
          hint="Browse recommended jobs and tap Apply."
        />
      ) : (
        <div className="space-y-3">
          {apps.map(({ entry, job }) => (
            <Link key={job.id} href={`/candidate/jobs/${job.id}`} className="block">
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold leading-tight">{job.role}</h3>
                    <p className="text-sm text-muted">{job.businessName}</p>
                  </div>
                  <MatchPercent score={entry.score} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-muted">
                    📍 {job.area} · 💰{" "}
                    {formatSalaryRange(job.salaryType, job.salaryMin, job.salaryMax) || "—"}
                  </p>
                  <StageBadge stage={entry.stage} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
