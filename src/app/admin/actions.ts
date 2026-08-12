"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  setBusinessStatus,
  setCandidateEmploymentStatus,
  setCandidateIdStatus,
  setJobStatus,
} from "@/lib/repos/admin";
import type { VerificationStatus } from "@/lib/types";

export async function reviewCandidateIdAction(
  candidateId: string,
  status: VerificationStatus,
) {
  await requireRole("admin");
  await setCandidateIdStatus(candidateId, status);
  revalidatePath("/admin/verifications");
  revalidatePath("/admin");
}

export async function reviewEmploymentAction(
  candidateId: string,
  status: VerificationStatus,
) {
  await requireRole("admin");
  await setCandidateEmploymentStatus(candidateId, status);
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
