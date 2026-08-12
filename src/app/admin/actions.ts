"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  setBusinessStatus,
  setCandidateEmploymentStatus,
  setCandidateIdStatus,
  setJobStatus,
} from "@/lib/repos/admin";
import { getCandidate } from "@/lib/repos/candidates";
import { resyncCandidateShortlistsQuietly } from "@/lib/repos/rematch";
import type { VerificationStatus } from "@/lib/types";

/**
 * A verification decision changes profile strength (which feeds the match
 * score) and the verification badges denormalized onto every shortlist row, so
 * those rows go stale the moment it's made. Refresh them off the response.
 */
function refreshShortlistsFor(candidateId: string) {
  after(async () => {
    const candidate = await getCandidate(candidateId);
    if (candidate) await resyncCandidateShortlistsQuietly(candidate);
  });
}

export async function reviewCandidateIdAction(
  candidateId: string,
  status: VerificationStatus,
) {
  await requireRole("admin");
  await setCandidateIdStatus(candidateId, status);
  refreshShortlistsFor(candidateId);
  revalidatePath("/admin/verifications");
  revalidatePath("/admin");
}

export async function reviewEmploymentAction(
  candidateId: string,
  status: VerificationStatus,
) {
  await requireRole("admin");
  await setCandidateEmploymentStatus(candidateId, status);
  refreshShortlistsFor(candidateId);
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

export async function toggleJobStatusAction(jobId: string, status: "live" | "closed") {
  await requireRole("admin");
  await setJobStatus(jobId, status);
  revalidatePath("/admin/jobs");
}
