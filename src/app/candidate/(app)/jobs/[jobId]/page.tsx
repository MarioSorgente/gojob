import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { getJob, scoreJobForCandidate } from "@/lib/repos/jobs";
import { getJobCandidate } from "@/lib/repos/pipeline";
import { formatSalaryRange } from "@/lib/cn";
import { Badge, Button, Card } from "@/components/ui";
import { MatchPercent, ReasonList } from "@/components/cards/match";
import { JobActions } from "@/components/candidate/JobActions";

export default async function CandidateJobDetail({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const user = await requireRole("candidate");
  const candidate = await getCandidate(user.uid);
  if (!candidate) redirect("/candidate/onboarding");

  const job = await getJob(jobId);
  if (!job || job.status !== "live") notFound();

  const { score, reasons } = await scoreJobForCandidate(job, candidate);
  const entry = await getJobCandidate(jobId, user.uid);
  const applied = entry?.candidateAction === "applied";
  const matched = entry?.matchId != null;

  const requiredSkills = job.skills.filter((s) => s.required);
  const preferredSkills = job.skills.filter((s) => !s.required);

  return (
    <div className="space-y-4">
      <Link href="/candidate" className="text-sm text-muted">
        ← All jobs
      </Link>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold leading-tight">{job.role}</h1>
            <p className="text-muted">{job.businessName}</p>
          </div>
          <MatchPercent score={score} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          {job.businessVerified ? (
            <Badge tone="green">✓ Verified Business</Badge>
          ) : (
            <Badge tone="slate">Unverified</Badge>
          )}
          <span>📍 {job.area}</span>
          <span>· {job.employmentType}</span>
        </div>
        <p className="mt-3 text-lg font-semibold">
          💰 {formatSalaryRange(job.salaryType, job.salaryMin, job.salaryMax) || "—"}
        </p>
      </Card>

      {reasons.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
            Why this is a good match
          </h2>
          <ReasonList reasons={reasons} />
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
          Details
        </h2>
        <dl className="space-y-2 text-sm">
          <Row label="Experience">
            {job.minimumExperience > 0
              ? `Minimum ${job.minimumExperience} year${job.minimumExperience === 1 ? "" : "s"}`
              : "No minimum"}
          </Row>
          {job.desiredStartDate && <Row label="Start">{job.desiredStartDate}</Row>}
          {requiredSkills.length > 0 && (
            <Row label="Required skills">
              {requiredSkills.map((s) => s.name).join(", ")}
            </Row>
          )}
          {preferredSkills.length > 0 && (
            <Row label="Preferred skills">
              {preferredSkills.map((s) => s.name).join(", ")}
            </Row>
          )}
          {job.languages.length > 0 && (
            <Row label="Languages">
              {job.languages.map((l) => `${l.language} (${l.minimumLevel}+)`).join(", ")}
            </Row>
          )}
        </dl>
        {job.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
            {job.description}
          </p>
        )}
      </Card>

      <div className="pt-1">
        {matched ? (
          <Link href="/candidate/matches">
            <Button size="lg" className="w-full">
              🎉 You matched — open chats
            </Button>
          </Link>
        ) : (
          <JobActions
            jobId={job.id}
            initialApplied={applied}
            businessName={job.businessName}
          />
        )}
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
