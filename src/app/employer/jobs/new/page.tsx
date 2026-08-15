import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { JobForm } from "@/components/employer/JobForm";
import { BackLink } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export default async function NewJobPage() {
  const user = await requireRole("employer");
  const business = await getBusinessByOwner(user.uid);
  if (!business) redirect("/employer/onboarding");

  const t = await getT();

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <BackLink href="/employer">{t("nav.jobs")}</BackLink>
      <h1 className="type-title mt-2">{t("employer.postJob")}</h1>
      <p className="mb-4 mt-1 text-sm text-muted">{t("employer.jobsSubtitle")}</p>
      <JobForm businessArea={business.area} />
    </main>
  );
}
