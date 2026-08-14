import type { ReactNode } from "react";
import type { CandidateSummary, MatchBreakdown } from "@/lib/types";
import { formatSalary } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { Translate } from "@/lib/i18n/dictionary";
import {
  areaLabel,
  availabilityLabel,
  languageLabel,
  proficiencyLabel,
  roleLabel,
} from "@/lib/i18n/taxonomy";
import { Avatar, Badge, Section } from "../ui";
import { Icon } from "../Icon";
import { MatchPercent, ReasonList } from "./match";
import { MatchExplain } from "./MatchExplain";

export function CandidateCard({
  summary,
  score,
  reasons,
  breakdown,
  footer,
  showReasons = true,
  locale,
  t,
}: {
  summary: CandidateSummary;
  score?: number;
  reasons?: string[];
  /** When present the score becomes tappable and explains itself. */
  breakdown?: MatchBreakdown;
  footer?: ReactNode;
  showReasons?: boolean;
  locale: Locale;
  t: Translate;
}) {
  const name = `${summary.firstName} ${summary.lastName}`.trim();
  const langs = summary.languages
    .map(
      (l) =>
        `${languageLabel(l.language, locale)} (${proficiencyLabel(l.level, locale)})`,
    )
    .join(", ");

  return (
    <article className="rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3">
        <Avatar name={name} photo={summary.photo} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-bold leading-tight">{name}</h3>
            {score != null &&
              (breakdown ? (
                <MatchExplain
                  score={score}
                  breakdown={breakdown}
                  reasons={reasons}
                  audience="employer"
                />
              ) : (
                <MatchPercent score={score} />
              ))}
          </div>
          <p className="text-sm text-muted">
            {roleLabel(summary.primaryRole, locale)} ·{" "}
            {summary.yearsExperience > 1
              ? t("job.experienceMin", { years: summary.yearsExperience })
              : summary.yearsExperience === 1
                ? t("job.experienceMinOne")
                : t("job.experienceNone")}
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-3 gap-y-1.5 text-sm sm:grid-cols-2">
        <div className="inline-flex items-center gap-1.5">
          <dt className="sr-only">{t("filter.area")}</dt>
          <Icon name="mapPin" className="h-4 w-4 text-muted" />
          <dd>{areaLabel(summary.area, locale)}</dd>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <dt className="sr-only">{t("candidate.availability")}</dt>
          <Icon name="clock" className="h-4 w-4 text-muted" />
          <dd>{availabilityLabel(summary.availability.type, locale)}</dd>
        </div>
        <div className="inline-flex items-center gap-1.5 font-semibold sm:col-span-2">
          <dt className="sr-only">{t("candidate.expectedSalary")}</dt>
          <Icon name="wallet" className="h-4 w-4 text-muted" />
          <dd>
            {formatSalary(
              summary.salary.type,
              summary.salary.min,
              summary.salary.max,
              locale,
            ) || (
              <span className="font-normal text-muted">
                {t("job.salaryUndisclosed")}
              </span>
            )}
          </dd>
        </div>
        {langs && (
          <div className="inline-flex items-center gap-1.5 text-subtle sm:col-span-2">
            <dt className="sr-only">{t("job.languages")}</dt>
            <Icon name="language" className="h-4 w-4 text-muted" />
            <dd>{langs}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        {summary.verification.phone === "verified" && (
          <Badge tone="green">
            <Icon name="checkBadge" className="h-3.5 w-3.5" />
            {t("auth.phone")}
          </Badge>
        )}
        {summary.verification.id === "verified" && (
          <Badge tone="green">
            <Icon name="checkBadge" className="h-3.5 w-3.5" />
            ID
          </Badge>
        )}
        {summary.verification.employment === "verified" && (
          <Badge tone="green">
            <Icon name="checkBadge" className="h-3.5 w-3.5" />
            {t("candidate.experience")}
          </Badge>
        )}
      </div>

      {showReasons && reasons && reasons.length > 0 && (
        <div className="mt-4 rounded-control bg-surface-muted p-3">
          <Section title={t("job.whyMatch")}>
            <ReasonList reasons={reasons} />
          </Section>
        </div>
      )}

      {footer}
    </article>
  );
}
