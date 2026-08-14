import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getJob } from "@/lib/repos/jobs";
import { getSessionUser, homePathFor } from "@/lib/auth";
import { formatSalary } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { ButtonLink, Card } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/brand";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { BfcacheGuard } from "@/components/BfcacheGuard";
import { JobDetail } from "@/components/cards/JobDetail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ jobId: string }>;
}): Promise<Metadata> {
  const { jobId } = await params;
  const job = await getJob(jobId).catch(() => null);
  if (!job) return { title: "Job not found" };
  // Metadata is crawled and shared, so it stays in the default locale rather
  // than following whoever happened to request it.
  const salary = formatSalary(
    job.salaryType,
    job.salaryMin,
    job.salaryMax,
    DEFAULT_LOCALE,
  );
  return {
    title: `${job.role} at ${job.businessName}`,
    description: `${job.employmentType} in ${job.area}. ${salary}. Apply through GoJob.`,
    openGraph: {
      title: `${job.role} at ${job.businessName}`,
      description: `${job.employmentType} · ${job.area} · ${salary}`,
    },
  };
}

/**
 * Public, shareable job page (scope §20). Anyone with the link can read it.
 * Applying sends them through registration, then straight back to this job.
 */
export default async function PublicJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = await getJob(jobId).catch(() => null);
  if (!job || job.status !== "live") notFound();

  const [user, { locale, t }] = await Promise.all([getSessionUser(), getI18n()]);

  // Signed-in candidates go straight to the in-app job; everyone else registers
  // first and is returned here afterwards.
  const applyHref =
    user?.role === "candidate"
      ? `/candidate/jobs/${job.id}`
      : user
        ? "/onboarding"
        : `/register?role=candidate&next=${encodeURIComponent(`/candidate/jobs/${job.id}`)}`;

  const applyButton = (
    <ButtonLink href={applyHref} size="lg" className="w-full">
      {t("job.applyViaGoJob")}
      <Icon name="arrowRight" className="h-4 w-4" />
    </ButtonLink>
  );

  return (
    <div className="min-h-dvh bg-background">
      <BfcacheGuard />

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-4 lg:px-8">
          <Link
            href="/"
            className="rounded outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <LocaleSwitcher current={locale} />
            {/* Session-aware, like the landing page: a signed-in visitor who
                followed a shared link must not be shown "Log in". */}
            {user ? (
              <ButtonLink href={homePathFor(user)} size="sm" variant="outline">
                {t("common.dashboard")}
              </ButtonLink>
            ) : (
              <Link
                href="/login"
                className="rounded px-1 py-1 text-sm font-semibold text-brand outline-none hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {t("common.logIn")}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-28 pt-5 lg:px-8 lg:pb-10">
        <JobDetail
          job={job}
          locale={locale}
          t={t}
          actions={
            <div className="space-y-4">
              {/* The rail carries the CTA from lg up; below that the fixed bar
                  at the bottom of the viewport does. */}
              <Card className="hidden p-4 lg:block">{applyButton}</Card>
              <div className="rounded-card bg-brand-soft p-4 text-center">
                <p className="text-sm font-semibold text-brand-dark">
                  {t("job.noCvNeeded")}
                </p>
              </div>
            </div>
          }
        />
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface/95 p-4 backdrop-blur lg:hidden">
        <div className="mx-auto max-w-md pb-[env(safe-area-inset-bottom,0px)]">
          {applyButton}
        </div>
      </div>
    </div>
  );
}
