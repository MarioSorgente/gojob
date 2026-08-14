import { formatSalary } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { Translate } from "@/lib/i18n/dictionary";
import { areaLabel, employmentTypeLabel } from "@/lib/i18n/taxonomy";
import { cn } from "@/lib/cn";
import { Icon } from "../Icon";

/**
 * The "where · what type · how much" line under a job title.
 *
 * Six pages wrote their own version of this with emoji separators, which is why
 * a screen reader used to announce "round pushpin Canggu money bag IDR 6 to 7 M".
 */
export function JobMeta({
  job,
  locale,
  t,
  showEmploymentType = false,
  className,
}: {
  job: {
    area: string;
    employmentType?: string;
    salaryType: string;
    salaryMin: number | null;
    salaryMax: number | null;
  };
  locale: Locale;
  t: Translate;
  showEmploymentType?: boolean;
  className?: string;
}) {
  const salary = formatSalary(job.salaryType, job.salaryMin, job.salaryMax, locale);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        <Icon name="mapPin" className="h-4 w-4" />
        {areaLabel(job.area, locale)}
      </span>
      {showEmploymentType && job.employmentType && (
        <span className="inline-flex items-center gap-1">
          <Icon name="clock" className="h-4 w-4" />
          {employmentTypeLabel(job.employmentType, locale)}
        </span>
      )}
      <span className="inline-flex items-center gap-1 font-medium text-foreground">
        <Icon name="wallet" className="h-4 w-4 text-muted" />
        {salary || (
          <span className="font-normal text-muted">{t("job.salaryUndisclosed")}</span>
        )}
      </span>
    </div>
  );
}
