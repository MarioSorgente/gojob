import Link from "next/link";
import type { CandidateAction, Job, MatchBreakdown } from "@/lib/types";
import { formatRelativeTime, formatSalary } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { Translate } from "@/lib/i18n/dictionary";
import { areaLabel, employmentTypeLabel, roleLabel } from "@/lib/i18n/taxonomy";
import { Avatar, Badge } from "../ui";
import { Icon } from "../Icon";
import { MatchPercent, ReasonList } from "./match";
import { MatchExplain } from "./MatchExplain";

/**
 * A job in a result list.
 *
 * The hierarchy follows JobStreet Indonesia, because it is the order a job
 * seeker actually scans in: who is hiring → for what → where → for how much →
 * how fresh is this. Two things were missing entirely before: the posting age
 * (a listing with no date reads as possibly dead) and whether the candidate has
 * already acted on it, which meant the feed kept re-offering dead ends.
 */
export function JobCard({
  job,
  score,
  reasons,
  breakdown,
  href,
  action,
  locale,
  t,
}: {
  job: Job;
  score?: number;
  reasons?: string[];
  /** When present the score becomes tappable and explains itself. */
  breakdown?: MatchBreakdown;
  href?: string;
  /** What this candidate has already done with the job, if anything. */
  action?: CandidateAction;
  locale: Locale;
  t: Translate;
}) {
  const salary = formatSalary(job.salaryType, job.salaryMin, job.salaryMax, locale);
  const acted = action === "applied" || action === "passed";

  return (
    <article
      className={`relative flex h-full flex-col rounded-card border border-border bg-surface p-4 shadow-card transition-[border-color,box-shadow] hover:border-brand/40 hover:shadow-raised focus-within:ring-2 focus-within:ring-brand/40 ${
        acted ? "opacity-75" : ""
      }`}
    >
      {/*
        A "stretched link": the anchor covers the whole card.

        It must have **no** `z-index` and the content must be **unpositioned**.
        Positioned elements paint above unpositioned ones, so the link ends up on
        top of the text and the entire card is clickable. The previous version
        gave the link `z-0` and every content block `relative` — which put those
        blocks in the same paint layer, later in tree order, so they covered the
        link. Only the thin gaps between them responded to a click; the title,
        salary and posted date did nothing.

        Controls that need their own click get `relative z-10` to sit back on top.
      */}
      {href && (
        <Link href={href} className="absolute inset-0 rounded-card outline-none">
          <span className="sr-only">
            {roleLabel(job.role, locale)} — {job.businessName}
          </span>
        </Link>
      )}

      <div className="flex items-start gap-3">
        <Avatar name={job.businessName} size={44} />

        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-tight">{roleLabel(job.role, locale)}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted">
            {job.businessName}
            {job.businessVerified && (
              <Icon
                name="checkBadge"
                className="h-3.5 w-3.5 shrink-0 text-success"
                title={t("job.verifiedBusiness")}
              />
            )}
          </p>
        </div>

        {score != null &&
          (breakdown ? (
            <div className="relative z-10 shrink-0">
              <MatchExplain score={score} breakdown={breakdown} reasons={reasons} />
            </div>
          ) : (
            <MatchPercent score={score} className="shrink-0" />
          ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
        <span className="inline-flex items-center gap-1">
          <Icon name="mapPin" className="h-4 w-4" />
          {areaLabel(job.area, locale)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="clock" className="h-4 w-4" />
          {employmentTypeLabel(job.employmentType, locale)}
        </span>
      </div>

      <p className="mt-2 inline-flex items-center gap-1.5 font-semibold">
        <Icon name="wallet" className="h-4 w-4 text-muted" />
        {salary || (
          <span className="font-normal text-muted">{t("job.salaryUndisclosed")}</span>
        )}
      </p>

      {reasons && reasons.length > 0 && (
        <div className="mt-3">
          <ReasonList reasons={reasons} limit={2} />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-2.5 text-xs text-muted">
        <span>
          {t("job.postedAgo", { time: formatRelativeTime(job.createdAt, locale) })}
        </span>
        {action === "applied" && (
          <Badge tone="green">
            <Icon name="check" className="h-3 w-3" />
            {t("job.applied")}
          </Badge>
        )}
        {action === "passed" && <Badge tone="slate">{t("job.passed")}</Badge>}
      </div>
    </article>
  );
}
