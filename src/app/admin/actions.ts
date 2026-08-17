"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  setBusinessStatus,
  setCandidateEmploymentStatus,
  setCandidateIdStatus,
  setJobStatus,
} from "@/lib/repos/admin";
import { enqueueCandidateRecommendations } from "@/lib/recommendationTasks";
import type { VerificationStatus } from "@/lib/types";

/**
 * A verification decision changes profile strength (which feeds the match
 * score) and the verification badges denormalized onto every shortlist row, so
 * those rows go stale the moment it's made. Enqueue a durable refresh so a
 * deployment or request timeout cannot lose the fan-out.
 */
function refreshShortlistsFor(candidateId: string) {
  return enqueueCandidateRecommendations(candidateId);
}

export async function reviewCandidateIdAction(
  candidateId: string,
  status: VerificationStatus,
) {
  await requireRole("admin");
  await setCandidateIdStatus(candidateId, status);
  await refreshShortlistsFor(candidateId);
  revalidatePath("/admin/verifications");
  revalidatePath("/admin");
}

export async function reviewEmploymentAction(
  candidateId: string,
  status: VerificationStatus,
) {
  await requireRole("admin");
  await setCandidateEmploymentStatus(candidateId, status);
  await refreshShortlistsFor(candidateId);
  revalidatePath("/admin/verifications");
}

export async function reviewBusinessAction(
  businessId: string,
  status: VerificationStatus,
) {
  await requireRole("admin");
  await setBusinessStatus(businessId, status);
  revalidatePath("/admin/businesses");
  revalidatePath("/admin");
}

export async function toggleJobStatusAction(
  jobId: string,
  status: "live" | "closed",
) {
  await requireRole("admin");
  await setJobStatus(jobId, status);
  revalidatePath("/admin/jobs");
}
