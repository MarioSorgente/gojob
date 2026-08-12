import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getJob } from "@/lib/repos/jobs";
import { getSessionUser } from "@/lib/auth";
import { formatSalaryRange } from "@/lib/cn";
import { Badge, Button, Card } from "@/components/ui";
import { Logo } from "@/components/brand";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ jobId: string }>;
}): Promise<Metadata> {
  const { jobId } = await params;
  const job = await getJob(jobId).catch(() => null);
  if (!job) return { title: "Job not found — GoJob" };
  const salary = formatSalaryRange(job.salaryType, job.salaryMin, job.salaryMax);
  return {
    title: `${job.role} at ${job.businessName} — GoJob`,
    description: `${job.employmentType} in ${job.area}. ${salary}. Apply through GoJob.`,
    openGraph: {
      title: `${job.role} at ${job.businessName}`,
      description: `${job.employmentType} · ${job.area} · ${salary}`,
    },
  };
}

/**
 * Public, shareable job page (scope §20). Anyone with the link can read it.
 * Applying sends them through registration, then straight back to this job.
 */
export default async function PublicJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = await getJob(jobId).catch(() => null);
  if (!job || job.status !== "live") notFound();

  const user = await getSessionUser();
  const required = job.skills.filter((s) => s.required);
  const preferred = job.skills.filter((s) => !s.required);

  // Signed-in candidates go straight to the in-app job; everyone else registers
  // first and is returned here afterwards.
  const applyHref =
    user?.role === "candidate"
      ? `/candidate/jobs/${job.id}`
      : user
        ? "/onboarding"
        : `/register?role=candidate&next=${encodeURIComponent(`/candidate/jobs/${job.id}`)}`;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5">
      <header className="flex items-center justify-between py-5">
        <Link href="/">
          <Logo />
        </Link>
        {!user && (
          <Link href="/login" className="text-sm font-semibold text-brand">
            Log in
          </Link>
        )}
      </header>

      <main className="flex-1 space-y-4 pb-28">
        <Card className="p-5">
          <h1 className="text-2xl font-extrabold leading-tight">{job.role}</h1>
          <p className="mt-0.5 text-muted">{job.businessName}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            {job.businessVerified ? (
              <Badge tone="green">✓ Verified Business</Badge>
            ) : (
              <Badge tone="slate">Unverified</Badge>
            )}
            <span>📍 {job.area}</span>
            <span>· {job.employmentType}</span>
          </div>
          <p className="mt-3 text-xl font-bold">
            💰 {formatSalaryRange(job.salaryType, job.salaryMin, job.salaryMax) || "—"}
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
            What they&apos;re looking for
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Experience">
              {job.minimumExperience > 0
                ? `Minimum ${job.minimumExperience} year${job.minimumExperience === 1 ? "" : "s"}`
                : "No minimum"}
            </Row>
            {required.length > 0 && (
              <Row label="Must have">{required.map((s) => s.name).join(", ")}</Row>
            )}
            {preferred.length > 0 && (
              <Row label="Nice to have">{preferred.map((s) => s.name).join(", ")}</Row>
            )}
            {job.languages.length > 0 && (
              <Row label="Languages">
                {job.languages.map((l) => `${l.language} (${l.minimumLevel}+)`).join(", ")}
              </Row>
            )}
            {job.desiredStartDate && <Row label="Start">{job.desiredStartDate}</Row>}
          </dl>
          {job.description && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
              {job.description}
            </p>
          )}
        </Card>

        <div className="rounded-2xl bg-brand-soft p-4 text-center">
          <p className="text-sm font-semibold text-brand-dark">
            No CV needed — build your profile once and apply to any venue in Bali.
          </p>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          <Link href={applyHref}>
            <Button size="lg" className="w-full">
              Apply through GoJob →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}
