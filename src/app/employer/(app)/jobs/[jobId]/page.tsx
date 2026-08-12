import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getJob } from "@/lib/repos/jobs";
import { getShortlist } from "@/lib/repos/pipeline";
import { formatSalaryRange } from "@/lib/cn";
import { Badge, Card, EmptyState } from "@/components/ui";
import { ShareJob } from "@/components/ShareJob";
import { SwipeDeck, type DeckCandidate } from "@/components/employer/SwipeDeck";
import { ApplicantRow } from "@/components/employer/ApplicantRow";
import { InviteButton } from "@/components/employer/InviteButton";
import { HireButton } from "@/components/employer/HireButton";
import { ShortlistProgress } from "@/components/employer/ShortlistProgress";

export default async function EmployerJobDetail({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ published?: string }>;
}) {
  const { jobId } = await params;
  const sp = await searchParams;
  const published = sp.published === "1";

  const user = await requireRole("employer");
  const job = await getJob(jobId);
  if (!job || job.ownerId !== user.uid) notFound();

  const shortlist = await getShortlist(jobId);

  // Jobs created before shortlistStatus existed have no value; treat those as
  // finished rather than leaving them spinning forever.
  const shortlistPending = job.shortlistStatus === "pending";
  const shortlistFailed = job.shortlistStatus === "failed";

  const deck: DeckCandidate[] = shortlist
    .filter(
      (e) =>
        e.employerAction === "none" &&
        e.candidateAction === "none" &&
        e.stage === "recommended",
    )
    .map((e) => ({
      candidateId: e.candidateId,
      summary: e.candidateSummary,
      score: e.score,
      reasons: e.reasons,
    }));

  const applied = shortlist.filter(
    (e) => e.candidateAction === "applied" && !e.matchId && e.employerAction !== "passed",
  );
  const saved = shortlist.filter(
    (e) => e.employerAction === "saved" && !e.matchId && e.stage !== "rejected",
  );
  const matched = shortlist.filter((e) => e.matchId && e.stage !== "hired");
  const hired = shortlist.filter((e) => e.stage === "hired");

  return (
    <div className="space-y-5">
      <Link href="/employer" className="text-sm text-muted">
        ← Dashboard
      </Link>

      {published && (
        <Card className="border-brand bg-brand-soft p-4">
          <p className="font-bold text-brand-dark">🎉 Your job is live!</p>
          <p className="text-sm text-brand-dark">
            {shortlistPending
              ? "We're finding candidates who match this position."
              : `${shortlist.length} potential candidate${shortlist.length === 1 ? "" : "s"} match this position.`}
          </p>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold">{job.role}</h1>
          <Badge tone={job.status === "live" ? "green" : "slate"}>{job.status}</Badge>
        </div>
        <p className="text-sm text-muted">
          📍 {job.area} · {job.employmentType} · 💰{" "}
          {formatSalaryRange(job.salaryType, job.salaryMin, job.salaryMax) || "—"}
        </p>
        <div className="mt-3">
          <ShareJob
            jobId={job.id}
            role={job.role}
            businessName={job.businessName}
          />
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
          Recommended candidates
        </h2>
        {shortlistPending || shortlistFailed ? (
          <ShortlistProgress failed={shortlistFailed} />
        ) : deck.length === 0 ? (
          <EmptyState
            icon="✅"
            title="No new candidates to review"
            hint="You've screened everyone in the current pool."
          />
        ) : (
          <SwipeDeck jobId={jobId} candidates={deck} />
        )}
      </section>

      {applied.length > 0 && (
        <Section title={`Applied to you (${applied.length})`}>
          {applied.map((e) => (
            <ApplicantRow
              key={e.candidateId}
              summary={e.candidateSummary}
              score={e.score}
              right={
                <InviteButton
                  jobId={jobId}
                  candidateId={e.candidateId}
                  name={e.candidateSummary.firstName}
                />
              }
            />
          ))}
        </Section>
      )}

      {saved.length > 0 && (
        <Section title={`Saved (${saved.length})`}>
          {saved.map((e) => (
            <ApplicantRow
              key={e.candidateId}
              summary={e.candidateSummary}
              score={e.score}
              right={
                <InviteButton
                  jobId={jobId}
                  candidateId={e.candidateId}
                  name={e.candidateSummary.firstName}
                />
              }
            />
          ))}
        </Section>
      )}

      {matched.length > 0 && (
        <Section title={`Matches (${matched.length})`}>
          {matched.map((e) => (
            <ApplicantRow
              key={e.candidateId}
              summary={e.candidateSummary}
              score={e.score}
              right={
                <div className="flex flex-col items-end gap-1.5">
                  {e.conversationId && (
                    <Link
                      href={`/employer/chat/${e.conversationId}`}
                      className="text-sm font-semibold text-brand"
                    >
                      Chat →
                    </Link>
                  )}
                  <HireButton jobId={jobId} candidateId={e.candidateId} />
                </div>
              }
            />
          ))}
        </Section>
      )}

      {hired.length > 0 && (
        <Section title={`Hired (${hired.length})`}>
          {hired.map((e) => (
            <ApplicantRow
              key={e.candidateId}
              summary={e.candidateSummary}
              score={e.score}
              right={<span className="text-sm font-semibold text-success">✓ Hired</span>}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
