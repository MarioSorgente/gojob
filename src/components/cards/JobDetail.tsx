import type { ReactNode } from "react";
import type { Job } from "@/lib/types";
import { formatDate, formatRelativeTime, formatSalary } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { Translate } from "@/lib/i18n/dictionary";
import {
  areaLabel,
  employmentTypeLabel,
  languageLabel,
  proficiencyLabel,
  roleLabel,
} from "@/lib/i18n/taxonomy";
import { Avatar, Badge, Card, DetailRow, Section } from "../ui";
import { Icon } from "../Icon";
import { ReasonList } from "./match";

/**
 * One job detail body, rendered by both the public `/jobs/[jobId]` page and the
 * in-app `/candidate/jobs/[jobId]` page.
 *
 * These were two near-identical implementations whose copy had already drifted
 * ("What they're looking for" vs "Details", "Must have" vs "Required skills")
 * and which rendered their h1 at different sizes. Translating both separately
 * would have doubled the drift.
 */
export function JobDetail({
  job,
  locale,
  t,
  score,
  reasons,
  /** Rendered beside the title — the match score explainer, when there is one. */
  titleAside,
  /** The sticky rail on desktop / the bottom bar on mobile. */
  actions,
}: {
  job: Job;
  locale: Locale;
  t: Translate;
  score?: number;
  reasons?: string[];
  titleAside?: ReactNode;
  actions?: ReactNode;
}) {
  const required = job.skills.filter((s) => s.required);
  const preferred = job.skills.filter((s) => !s.required);
  const salary = formatSalary(job.salaryType, job.salaryMin, job.salaryMax, locale);

  return (
    // Two columns from lg. The public page used to cap at 448px even on a
    // 1440px screen, which left two thirds of the viewport empty.
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <Avatar name={job.businessName} size={52} />
            <div className="min-w-0 flex-1">
              <h1 className="type-title">{roleLabel(job.role, locale)}</h1>
              <p className="mt-0.5 text-muted">{job.businessName}</p>
            </div>
            {titleAside}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {job.businessVerified ? (
              <Badge tone="green">
                <Icon name="checkBadge" className="h-3.5 w-3.5" />
                {t("job.verifiedBusiness")}
              </Badge>
            ) : (
              <Badge tone="slate">{t("common.unverified")}</Badge>
            )}
            <Badge tone="slate">
              <Icon name="mapPin" className="h-3.5 w-3.5" />
              {areaLabel(job.area, locale)}
            </Badge>
            <Badge tone="slate">
              <Icon name="clock" className="h-3.5 w-3.5" />
              {employmentTypeLabel(job.employmentType, locale)}
            </Badge>
          </div>

          <p className="mt-4 flex items-center gap-2 text-lg font-bold">
            <Icon name="wallet" className="h-5 w-5 text-muted" />
            {salary || (
              <span className="text-base font-normal text-muted">
                {t("job.salaryUndisclosed")}
              </span>
            )}
          </p>

          <p className="mt-3 border-t border-border/70 pt-3 text-xs text-muted">
            {t("job.postedAgo", { time: formatRelativeTime(job.createdAt, locale) })}
          </p>
        </Card>

        {score != null && reasons && reasons.length > 0 && (
          <Card className="p-5">
            <Section title={t("job.whyMatch")}>
              <ReasonList reasons={reasons} />
            </Section>
          </Card>
        )}

        <Card className="p-5">
          <Section title={t("job.whatTheyWant")}>
            <dl className="text-sm">
              <DetailRow label={t("job.experience")}>
                {job.minimumExperience > 1
                  ? t("job.experienceMin", { years: job.minimumExperience })
                  : job.minimumExperience === 1
                    ? t("job.experienceMinOne")
                    : t("job.experienceNone")}
              </DetailRow>
              {required.length > 0 && (
                <DetailRow label={t("job.mustHave")}>
                  {required.map((s) => s.name).join(", ")}
                </DetailRow>
              )}
              {preferred.length > 0 && (
                <DetailRow label={t("job.niceToHave")}>
                  {preferred.map((s) => s.name).join(", ")}
                </DetailRow>
              )}
              {job.languages.length > 0 && (
                <DetailRow label={t("job.languages")}>
                  {job.languages
                    .map(
                      (l) =>
                        `${languageLabel(l.language, locale)} (${proficiencyLabel(l.minimumLevel, locale)}+)`,
                    )
                    .join(", ")}
                </DetailRow>
              )}
              {job.desiredStartDate && (
                <DetailRow label={t("job.startDate")}>
                  {formatDate(job.desiredStartDate, locale)}
                </DetailRow>
              )}
            </dl>
          </Section>
        </Card>

        {job.description && (
          <Card className="p-5">
            <Section title={t("job.description")}>
              <p className="whitespace-pre-wrap text-sm leading-6 text-subtle">
                {job.description}
              </p>
            </Section>
          </Card>
        )}
      </div>

      {actions ? (
        <div className="lg:sticky lg:top-6">{actions}</div>
      ) : null}
    </div>
  );
}
