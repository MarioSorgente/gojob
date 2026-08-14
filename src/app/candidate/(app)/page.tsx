import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { recommendedJobsPage } from "@/lib/repos/jobs";
import { listCandidateActions } from "@/lib/repos/pipeline";
import { JobResults } from "@/components/candidate/JobResults";
import { ButtonLink, PageTitle } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { getT } from "@/lib/i18n/server";

export default async function CandidateHome() {
  const user = await requireRole("candidate");
  const candidate = await getCandidate(user.uid);
  if (!candidate) redirect("/candidate/onboarding");

  const t = await getT();
  const [firstPage, actions] = await Promise.all([
    recommendedJobsPage(candidate, {}, null),
    listCandidateActions(user.uid).catch(() => ({})),
  ]);

  return (
    <>
      <PageTitle
        title={t("candidate.greeting", { name: candidate.firstName || "" }).trim()}
        subtitle={t("candidate.recommended")}
        action={
          // /candidate/applications existed but nothing in the app linked to
          // it — a candidate could not reach their own application history.
          <ButtonLink href="/candidate/applications" variant="outline" size="sm">
            <Icon name="inbox" className="h-4 w-4" />
            {t("nav.applications")}
          </ButtonLink>
        }
      />
      <JobResults
        initialItems={firstPage.items}
        initialCursor={firstPage.nextCursor}
        filters={{}}
        label={t("candidate.recommendedLabel")}
        emptyTitle={t("filter.noJobs")}
        emptyHint={t("filter.noJobsHint")}
        emptyAction={
          <ButtonLink href="/candidate/search">{t("filter.searchJobs")}</ButtonLink>
        }
        actions={actions}
      />
    </>
  );
}
