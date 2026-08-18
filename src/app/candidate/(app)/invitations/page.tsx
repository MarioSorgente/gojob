import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listCandidateInvitations } from "@/lib/repos/pipeline";
import { getI18n } from "@/lib/i18n/server";
import { roleLabel } from "@/lib/i18n/taxonomy";
import { ButtonLink, Card, EmptyState, PageTitle } from "@/components/ui";
import { ReasonList } from "@/components/cards/match";
import { JobMeta } from "@/components/cards/JobMeta";
import { InvitationActions } from "@/components/candidate/InvitationActions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("candidate.invitationsTitle") };
}

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const user = await requireRole("candidate");
  const params = await searchParams;
  const [invitePage, { locale, t }] = await Promise.all([
    listCandidateInvitations(user.uid, params.cursor ?? null),
    getI18n(),
  ]);
  const invites = invitePage.items;

  return (
    <>
      <PageTitle
        title={t("candidate.invitationsTitle")}
        subtitle={t("candidate.invitationsSubtitle")}
      />
      {invites.length === 0 ? (
        <EmptyState
          icon="sparkle"
          title={t("candidate.noInvitations")}
          hint={t("candidate.noInvitationsHint")}
          action={
            <ButtonLink href="/candidate/profile" variant="outline">
              {t("candidate.editProfile")}
            </ButtonLink>
          }
        />
      ) : (
        <ul className="space-y-3">
          {invites.map(({ entry, job }) => (
            <li key={job.id}>
              <Card className="p-4">
                <p className="text-sm text-muted">
                  <span className="font-semibold text-foreground">
                    {job.businessName}
                  </span>
                </p>
                <h2 className="mt-0.5 text-lg font-bold leading-tight">
                  {roleLabel(job.role, locale)}
                </h2>
                <JobMeta
                  job={job}
                  locale={locale}
                  t={t}
                  showEmploymentType
                  className="mt-2"
                />
                {entry.reasons.length > 0 && (
                  <div className="mt-3">
                    <ReasonList reasons={entry.reasons} limit={3} />
                  </div>
                )}
                <InvitationActions
                  jobId={job.id}
                  businessName={job.businessName}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}
      {invitePage.nextCursor && (
        <div className="mt-6 text-center">
          <ButtonLink
            href={`/candidate/invitations?cursor=${encodeURIComponent(invitePage.nextCursor)}`}
            variant="outline"
          >
            {t("common.loadMore")}
          </ButtonLink>
        </div>
      )}
    </>
  );
}
