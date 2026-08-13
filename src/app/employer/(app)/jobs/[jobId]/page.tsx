import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getJob } from "@/lib/repos/jobs";
import { getShortlistPage } from "@/lib/repos/pipeline";
import { formatSalaryRange } from "@/lib/cn";
import { Badge, Card, EmptyState, Section } from "@/components/ui";
import { MatchExplain } from "@/components/cards/MatchExplain";
import { UnsaveButton } from "@/components/employer/UnsaveButton";
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
  searchParams: Promise<{ published?: string; shortlistCursor?: string }>;
}) {
  const { jobId } = await params;
  const sp = await searchParams;
  const published = sp.published === "1";

  const user = await requireRole("employer");
  const job = await getJob(jobId);
  if (!job || job.ownerId !== user.uid) notFound();

  const shortlistPage = await getShortlistPage(
    jobId,
    sp.shortlistCursor ?? null,
  );
  const shortlist = shortlistPage.items;

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
      breakdown: e.breakdown,
    }));

  const applied = shortlist.filter(
    (e) =>
      e.candidateAction === "applied" &&
      !e.matchId &&
      e.employerAction !== "passed",
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
          <Badge tone={job.status === "live" ? "green" : "slate"}>
            {job.status}
          </Badge>
        </div>
        <p className="text-sm text-muted">
          📍 {job.area} · {job.employmentType} · 💰{" "}
          {formatSalaryRange(job.salaryType, job.salaryMin, job.salaryMax) ||
            "—"}
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
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {applied.map((e) => (
              <ApplicantRow
                key={e.candidateId}
                summary={e.candidateSummary}
                scoreSlot={
                  <MatchExplain
                    score={e.score}
                    breakdown={e.breakdown}
                    reasons={e.reasons}
                    audience="employer"
                  />
                }
                right={
                  <InviteButton
                    jobId={jobId}
                    candidateId={e.candidateId}
                    name={e.candidateSummary.firstName}
                  />
                }
              />
            ))}
          </div>
        </Section>
      )}

      {saved.length > 0 && (
        <Section
          title={`Saved (${saved.length})`}
          action={
            <Link
              href="/employer/shortlist"
              className="rounded text-sm font-semibold text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              All saved
            </Link>
          }
        >
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {saved.map((e) => (
              <ApplicantRow
                key={e.candidateId}
                summary={e.candidateSummary}
                scoreSlot={
                  <MatchExplain
                    score={e.score}
                    breakdown={e.breakdown}
                    reasons={e.reasons}
                    audience="employer"
                  />
                }
                right={
                  <div className="flex flex-col gap-1.5">
                    <InviteButton
                      jobId={jobId}
                      candidateId={e.candidateId}
                      name={e.candidateSummary.firstName}
                    />
                    <UnsaveButton
                      jobId={jobId}
                      candidateId={e.candidateId}
                      name={e.candidateSummary.firstName}
                    />
                  </div>
                }
              />
            ))}
          </div>
        </Section>
      )}

      {matched.length > 0 && (
        <Section title={`Matches (${matched.length})`}>
          <div className="space-y-2">
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
          </div>
        </Section>
      )}

      {hired.length > 0 && (
        <Section title={`Hired (${hired.length})`}>
          <div className="space-y-2">
            {hired.map((e) => (
              <ApplicantRow
                key={e.candidateId}
                summary={e.candidateSummary}
                score={e.score}
                right={
                  <span className="text-sm font-semibold text-success">
                    ✓ Hired
                  </span>
                }
              />
            ))}
          </div>
        </Section>
      )}

      {shortlistPage.nextCursor && (
        <div className="flex justify-center">
          <Link
            href={`/employer/jobs/${jobId}?shortlistCursor=${encodeURIComponent(shortlistPage.nextCursor)}`}
            className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-soft"
          >
            Load more candidates →
          </Link>
        </div>
      )}
    </div>
  );
}
