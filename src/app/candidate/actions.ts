"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  candidateApply,
  candidatePass,
  respondToInvitation,
  type ActionResult,
} from "@/lib/repos/pipeline";

export async function applyToJobAction(jobId: string): Promise<ActionResult> {
  const user = await requireRole("candidate");

  const limited = await checkRateLimit(user.uid, "apply");
  if (limited) return { matched: false, error: limited };

  const res = await candidateApply(jobId, user.uid);
  revalidatePath("/candidate");
  revalidatePath("/candidate/applications");
  revalidatePath("/candidate/invitations");
  revalidatePath("/candidate/matches");
  return res;
}

export async function passJobAction(jobId: string): Promise<void> {
  const user = await requireRole("candidate");
  await candidatePass(jobId, user.uid);
  revalidatePath("/candidate");
}

export async function respondInvitationAction(
  jobId: string,
  accept: boolean,
): Promise<ActionResult> {
  const user = await requireRole("candidate");
  const res = await respondToInvitation(jobId, user.uid, accept);
  revalidatePath("/candidate/invitations");
  revalidatePath("/candidate/matches");
  return res;
}
