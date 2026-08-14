import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getJob } from "@/lib/repos/jobs";
import { getShortlistPage } from "@/lib/repos/pipeline";
import { getI18n } from "@/lib/i18n/server";
import { areaLabel, employmentTypeLabel, roleLabel } from "@/lib/i18n/taxonomy";
import { formatSalary } from "@/lib/format";
import {
  Alert,
  BackLink,
  Badge,
  ButtonLink,
  EmptyState,
  Section,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
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

  const { locale, t } = await getI18n();
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
      <BackLink href="/employer">{t("nav.jobs")}</BackLink>

      {published && (
        <Alert tone="success" title={t("employer.jobsTitle")}>
          {shortlistPending
            ? t("employer.shortlistPending")
            : t("employer.shortlistCount", { count: shortlist.length })}
        </Alert>
      )}

      <div>
        <div className="flex items-start justify-between gap-2">
          <h1 className="type-title">{roleLabel(job.role, locale)}</h1>
          <Badge tone={job.status === "live" ? "green" : "slate"}>
            {job.status}
          </Badge>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="mapPin" className="h-4 w-4" />
            {areaLabel(job.area, locale)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" className="h-4 w-4" />
            {employmentTypeLabel(job.employmentType, locale)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="wallet" className="h-4 w-4" />
            {formatSalary(job.salaryType, job.salaryMin, job.salaryMax, locale) ||
              t("job.salaryUndisclosed")}
          </span>
        </p>
        <div className="mt-3">
          <ShareJob
            jobId={job.id}
            role={job.role}
            businessName={job.businessName}
          />
        </div>
      </div>

      <Section title={t("employer.recommended")}>
        {shortlistPending || shortlistFailed ? (
          <ShortlistProgress failed={shortlistFailed} />
        ) : deck.length === 0 ? (
          <EmptyState
            icon="checkBadge"
            title={t("employer.noCandidates")}
            hint={t("employer.noCandidatesHint")}
            action={
              <ButtonLink href="/employer/candidates" variant="outline">
                {t("employer.findCandidates")}
              </ButtonLink>
            }
          />
        ) : (
          <SwipeDeck jobId={jobId} candidates={deck} locale={locale} />
        )}
      </Section>

      {applied.length > 0 && (
        <Section title={`${t("employer.applicants")} · ${applied.length}`}>
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {applied.map((e) => (
              <ApplicantRow
                key={e.candidateId}
                summary={e.candidateSummary}
                locale={locale}
                t={t}
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
          title={`${t("nav.shortlist")} · ${saved.length}`}
          action={
            <Link
              href="/employer/shortlist"
              className="rounded text-sm font-semibold text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              {t("common.seeAll")}
            </Link>
          }
        >
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {saved.map((e) => (
              <ApplicantRow
                key={e.candidateId}
                summary={e.candidateSummary}
                locale={locale}
                t={t}
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
        <Section title={`${t("chat.title")} · ${matched.length}`}>
          <div className="space-y-2">
            {matched.map((e) => (
              <ApplicantRow
                key={e.candidateId}
                summary={e.candidateSummary}
                locale={locale}
                t={t}
                score={e.score}
                right={
                  <div className="flex flex-col items-end gap-1.5">
                    {e.conversationId && (
                      <Link
                        href={`/employer/chat/${e.conversationId}`}
                        className="inline-flex items-center gap-1 rounded text-sm font-semibold text-brand outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                      >
                        {t("chat.openChat")}
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
        <Section title={`${t("employer.hire")} · ${hired.length}`}>
          <div className="space-y-2">
            {hired.map((e) => (
              <ApplicantRow
                key={e.candidateId}
                summary={e.candidateSummary}
                locale={locale}
                t={t}
                score={e.score}
                right={
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
                    <Icon name="check" className="h-4 w-4" />
                    {t("employer.hire")}
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
            className="rounded-control border border-brand px-4 py-2 text-sm font-semibold text-brand outline-none hover:bg-brand-soft focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {t("common.loadMore")}
          </Link>
        </div>
      )}
    </div>
  );
}
