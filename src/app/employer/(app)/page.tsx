import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { listJobsByBusiness } from "@/lib/repos/jobs";
import { formatRelativeTime } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { areaLabel, employmentTypeLabel, roleLabel } from "@/lib/i18n/taxonomy";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageTitle,
} from "@/components/ui";
import { Icon } from "@/components/Icon";

export default async function EmployerDashboard() {
  const user = await requireRole("employer");
  const business = await getBusinessByOwner(user.uid);
  if (!business) redirect("/employer/onboarding");

  const { locale, t } = await getI18n();
  const jobs = await listJobsByBusiness(business.id);

  return (
    <>
      <PageTitle
        title={business.name}
        subtitle={`${
          business.verificationStatus === "verified"
            ? t("common.verified")
            : t("common.unverified")
        } · ${areaLabel(business.area, locale)}`}
        action={
          <ButtonLink href="/employer/jobs/new">
            <Icon name="plus" className="h-4 w-4" />
            {t("employer.postJob")}
          </ButtonLink>
        }
      />

      {jobs.length === 0 ? (
        <EmptyState
          icon="briefcase"
          title={t("employer.noJobs")}
          hint={t("employer.noJobsHint")}
          action={
            <ButtonLink href="/employer/jobs/new">
              <Icon name="plus" className="h-4 w-4" />
              {t("employer.postJob")}
            </ButtonLink>
          }
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/employer/jobs/${job.id}`}
                className="block h-full rounded-card outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
              >
                <Card className="h-full p-4 transition-[border-color,box-shadow] hover:border-brand/40 hover:shadow-raised">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold leading-tight">
                      {roleLabel(job.role, locale)}
                    </h2>
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
                  </p>

                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border/70 pt-3 text-sm">
                    <div>
                      <dd className="text-lg font-bold tabular-nums text-brand">
                        {job.shortlistCount ?? 0}
                      </dd>
                      <dt className="text-xs text-muted">
                        {t("employer.recommended")}
                      </dt>
                    </div>
                    <div>
                      <dd className="text-lg font-bold tabular-nums text-brand">
                        {job.applicationCount ?? 0}
                      </dd>
                      <dt className="text-xs text-muted">
                        {t("employer.applicants")}
                      </dt>
                    </div>
                    <div>
                      <dd className="text-lg font-bold tabular-nums text-brand">
                        {job.matchCount ?? 0}
                      </dd>
                      <dt className="text-xs text-muted">{t("chat.title")}</dt>
                    </div>
                  </dl>

                  <p className="mt-3 text-xs text-muted">
                    {t("job.postedAgo", {
                      time: formatRelativeTime(job.createdAt, locale),
                    })}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
