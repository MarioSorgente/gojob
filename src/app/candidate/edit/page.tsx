import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { OnboardingForm } from "@/components/candidate/OnboardingForm";
import type { CandidateOnboardingInput } from "@/lib/forms";
import { BackLink } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export default async function CandidateEditPage() {
  const user = await requireRole("candidate");
  const c = await getCandidate(user.uid);
  if (!c) redirect("/candidate/onboarding");

  const defaults: Partial<CandidateOnboardingInput> = {
    firstName: c.firstName,
    lastName: c.lastName,
    nationality: c.nationality,
    workEligibility: c.workEligibility,
    area: c.area,
    roles: c.roles,
    employmentTypes: c.employmentTypes,
    salary: c.salary,
    availability: {
      type: c.availability.type,
      availableFrom: c.availability.availableFrom,
    },
    languages: c.languages,
    skills: c.skills.map((s) => ({ name: s.name })),
    experiences: c.experiences.map((e) => ({
      companyName: e.companyName,
      role: e.role,
      startDate: e.startDate,
      endDate: e.endDate,
      current: e.current,
      description: e.description,
    })),
  };

  const t = await getT();

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <BackLink href="/candidate/profile">{t("nav.profile")}</BackLink>
      <h1 className="type-title mt-2">{t("candidate.editProfile")}</h1>
      <div className="mt-4">
        <OnboardingForm defaults={defaults} submitLabel={t("common.save")} />
      </div>
    </div>
  );
}
