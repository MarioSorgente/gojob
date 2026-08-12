import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { listJobsByBusiness } from "@/lib/repos/jobs";
import { getShortlist } from "@/lib/repos/pipeline";
import { Badge, Button, Card, EmptyState } from "@/components/ui";

export default async function EmployerDashboard() {
  const user = await requireRole("employer");
  const business = await getBusinessByOwner(user.uid);
  if (!business) redirect("/employer/onboarding");

  const jobs = await listJobsByBusiness(business.id);
  const withStats = await Promise.all(
    jobs.map(async (job) => {
      const sl = await getShortlist(job.id);
      return {
        job,
        total: sl.length,
        applied: sl.filter((e) => e.candidateAction === "applied").length,
        matched: sl.filter((e) =>
          ["matched", "interview", "hired"].includes(e.stage),
        ).length,
      };
    }),
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

      <Link href="/employer/jobs/new">
        <Button size="lg" className="w-full">
          + Post a Job
        </Button>
      </Link>

      <div className="mt-5 space-y-3">
        {withStats.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No jobs yet"
            hint="Post your first job to see matching candidates instantly."
          />
        ) : (
          withStats.map(({ job, total, applied, matched }) => (
            <Link key={job.id} href={`/employer/jobs/${job.id}`} className="block">
              <Card className="p-4">
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
