import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { listJobsByBusiness } from "@/lib/repos/jobs";
import { getShortlistCounts } from "@/lib/repos/pipeline";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";

export default async function EmployerDashboard() {
  const user = await requireRole("employer");
  const business = await getBusinessByOwner(user.uid);
  if (!business) redirect("/employer/onboarding");

  const jobs = await listJobsByBusiness(business.id);
  const withStats = await Promise.all(
    jobs.map(async (job) => ({ job, ...(await getShortlistCounts(job.id)) })),
  );

  return (
    <>
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight">{business.name}</h1>
        <p className="mt-0.5 text-sm text-muted">
          {business.verificationStatus === "verified"
            ? "✓ Verified business"
            : "Unverified business"}{" "}
          · 📍 {business.area}
        </p>
      </div>

      <ButtonLink href="/employer/jobs/new" size="lg" className="w-full md:w-auto">
        + Post a Job
      </ButtonLink>

      <div className="mt-5 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
        {withStats.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No jobs yet"
            hint="Post your first job to see matching candidates instantly."
          />
        ) : (
          withStats.map(({ job, total, applied, matched }) => (
            <Link
              key={job.id}
              href={`/employer/jobs/${job.id}`}
              className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
            >
              <Card className="h-full p-4 transition-colors hover:border-brand/40">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold leading-tight">{job.role}</h3>
                  <Badge tone={job.status === "live" ? "green" : "slate"}>
                    {job.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted">
                  📍 {job.area} · {job.employmentType}
                </p>
                <div className="mt-2 flex gap-4 text-sm">
                  <span>
                    <b className="text-brand">{total}</b> candidates
                  </span>
                  <span>
                    <b className="text-brand">{applied}</b> applied
                  </span>
                  <span>
                    <b className="text-brand">{matched}</b> matched
                  </span>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
