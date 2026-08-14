import { getT } from "@/lib/i18n/server";
import { ErrorScreen } from "@/components/ErrorScreen";
import { ButtonLink } from "@/components/ui";

/**
 * Shared job links are the acquisition surface (scope §20) — they land on
 * Instagram and WhatsApp and outlive the job. A filled or closed role has to
 * offer a stranger somewhere to go, not a raw 404.
 */
export default async function JobNotFound() {
  const t = await getT();
  return (
    <ErrorScreen icon="briefcase" title={t("job.notFound")} hint={t("job.notFoundHint")}>
      <div className="mt-3">
        <ButtonLink href="/register?role=candidate" variant="ghost">
          {t("landing.ctaCandidate")}
        </ButtonLink>
      </div>
    </ErrorScreen>
  );
}
