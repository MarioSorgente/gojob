import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listCandidateApplications } from "@/lib/repos/pipeline";
import { getI18n } from "@/lib/i18n/server";
import { roleLabel } from "@/lib/i18n/taxonomy";
import { formatRelativeTime } from "@/lib/format";
import { BackLink, ButtonLink, Card, EmptyState, PageTitle } from "@/components/ui";
import { MatchPercent } from "@/components/cards/match";
import { JobMeta } from "@/components/cards/JobMeta";
import { StageBadge } from "@/components/StageBadge";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("candidate.applicationsTitle") };
}

export default async function ApplicationsPage() {
  const user = await requireRole("candidate");
  const [apps, { locale, t }] = await Promise.all([
    listCandidateApplications(user.uid),
    getI18n(),
  ]);

  return (
    <>
      <BackLink href="/candidate">{t("nav.forYou")}</BackLink>
      <PageTitle
        title={t("candidate.applicationsTitle")}
        subtitle={t("candidate.applicationsSubtitle")}
      />
      {apps.length === 0 ? (
        <EmptyState
          icon="inbox"
          title={t("candidate.noApplications")}
          hint={t("candidate.noApplicationsHint")}
          action={
            <ButtonLink href="/candidate/search">{t("filter.searchJobs")}</ButtonLink>
          }
        />
      ) : (
        <ul className="space-y-3">
          {apps.map(({ entry, job }) => (
            <li key={job.id}>
              <Link
                href={`/candidate/jobs/${job.id}`}
                className="block rounded-card outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <Card className="p-4 transition-[border-color,box-shadow] hover:border-brand/40 hover:shadow-raised">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-bold leading-tight">
                        {roleLabel(job.role, locale)}
                      </h2>
                      <p className="truncate text-sm text-muted">{job.businessName}</p>
                    </div>
                    <MatchPercent score={entry.score} />
                  </div>
                  <JobMeta job={job} locale={locale} t={t} className="mt-2" />
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-2.5 text-xs text-muted">
                    <span>
                      {t("job.postedAgo", {
                        time: formatRelativeTime(entry.updatedAt, locale),
                      })}
                    </span>
                    <StageBadge stage={entry.stage} />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
