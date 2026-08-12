"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/lib/auth";
import { markOnboardingComplete } from "@/lib/repos/users";
import { setCandidateVerification, upsertCandidate } from "@/lib/repos/candidates";
import type { CandidateOnboardingInput } from "@/lib/forms";
import type { Experience, SkillRef } from "@/lib/types";

export async function saveCandidateProfile(input: CandidateOnboardingInput) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const experiences: Experience[] = input.experiences
    .filter((e) => e.companyName.trim() || e.role.trim())
    .map((e) => ({
      id: randomUUID(),
      companyName: e.companyName.trim(),
      role: e.role.trim(),
      startDate: e.startDate,
      endDate: e.current ? null : e.endDate,
      current: e.current,
      description: e.description.trim(),
      verificationStatus: "not_submitted",
    }));

  const skills: SkillRef[] = input.skills
    .map((s) => ({ name: s.name.trim() }))
    .filter((s) => s.name.length > 0);

  await upsertCandidate(user.uid, {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    nationality: input.nationality.trim(),
    workEligibility: input.workEligibility,
    area: input.area,
    roles: input.roles,
    employmentTypes: input.employmentTypes as never,
    salary: input.salary,
    availability: {
      type: input.availability.type as never,
      availableFrom: input.availability.availableFrom,
    },
    languages: input.languages,
    skills,
    experiences,
  });

  // Signing up by phone confirms it; reflect that in verification + strength.
  if (user.phone) {
    await setCandidateVerification(user.uid, "phone", "verified");
  }

  await markOnboardingComplete(user.uid);
  redirect("/candidate");
}
