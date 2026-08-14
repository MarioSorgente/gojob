import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { getJob, scoreJobForCandidate } from "@/lib/repos/jobs";
import { getJobCandidate } from "@/lib/repos/pipeline";
import { getI18n } from "@/lib/i18n/server";
import { roleLabel } from "@/lib/i18n/taxonomy";
import { BackLink, ButtonLink, Card } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { MatchExplain } from "@/components/cards/MatchExplain";
import { JobDetail } from "@/components/cards/JobDetail";
import { JobActions } from "@/components/candidate/JobActions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ jobId: string }>;
}): Promise<Metadata> {
  const { jobId } = await params;
  const job = await getJob(jobId).catch(() => null);
  return { title: job ? `${job.role} — ${job.businessName}` : "Job" };
}

export default async function CandidateJobDetail({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const user = await requireRole("candidate");
  const candidate = await getCandidate(user.uid);
  if (!candidate) redirect("/candidate/onboarding");

  const job = await getJob(jobId);
  if (!job || job.status !== "live") notFound();

  const { locale, t } = await getI18n();
  const [{ score, reasons, breakdown }, entry] = await Promise.all([
    scoreJobForCandidate(job, candidate),
    getJobCandidate(jobId, user.uid),
  ]);

  const applied = entry?.candidateAction === "applied";
  const matched = entry?.matchId != null;

  return (
    <div className="space-y-4">
      <BackLink href="/candidate">{t("nav.forYou")}</BackLink>

      <JobDetail
        job={job}
        locale={locale}
        t={t}
        score={score}
        reasons={reasons}
        titleAside={
          <MatchExplain score={score} breakdown={breakdown} reasons={reasons} />
        }
        actions={
          <Card className="p-4">
            <p className="type-eyebrow mb-3">{roleLabel(job.role, locale)}</p>
            {matched ? (
              <ButtonLink href="/candidate/matches" size="lg" className="w-full">
                <Icon name="chat" className="h-4 w-4" />
                {t("chat.openChat")}
              </ButtonLink>
            ) : (
              <JobActions
                jobId={job.id}
                initialApplied={applied}
                businessName={job.businessName}
              />
            )}
          </Card>
        }
      />
    </div>
  );
}
