import Link from "next/link";
import { listAllJobs } from "@/lib/repos/admin";
import { formatSalary } from "@/lib/format";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { Badge, Card, EmptyState } from "@/components/ui";
import { JobStatusToggle } from "@/components/admin/JobStatusToggle";

const tone = { live: "green", draft: "slate", closed: "red" } as const;

export default async function AdminJobsPage() {
  const jobs = await listAllJobs();

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Jobs</h1>
      <p className="mb-5 text-sm text-muted">
        {jobs.length} total · {jobs.filter((j) => j.status === "live").length} live
      </p>

      {jobs.length === 0 ? (
        <EmptyState icon="briefcase" title="No jobs posted yet" />
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => (
            <Card key={j.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/jobs/${j.id}`} className="truncate font-semibold hover:underline">
                    {j.role}
                  </Link>
                  <Badge tone={tone[j.status]}>{j.status}</Badge>
                </div>
                <p className="truncate text-xs text-muted">
                  {j.businessName} · {j.area} · {j.employmentType}
                </p>
                <p className="truncate text-xs text-muted">
                  {formatSalary(j.salaryType, j.salaryMin, j.salaryMax, DEFAULT_LOCALE) || "—"} ·{" "}
                  {j.createdAt?.slice(0, 10)}
                </p>
              </div>
              <JobStatusToggle jobId={j.id} status={j.status} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
