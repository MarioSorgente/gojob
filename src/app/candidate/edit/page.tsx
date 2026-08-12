import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { OnboardingForm } from "@/components/candidate/OnboardingForm";
import type { CandidateOnboardingInput } from "@/lib/forms";

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

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <Link href="/candidate/profile" className="text-sm text-muted">
        ← Back to profile
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Edit profile</h1>
      <div className="mt-4">
        <OnboardingForm defaults={defaults} submitLabel="Save changes" />
      </div>
    </div>
  );
}
