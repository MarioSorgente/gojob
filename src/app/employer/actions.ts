"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { createAndPublishJob, generateShortlist, getJob } from "@/lib/repos/jobs";
import {
  ensureShortlistEntry,
  markHired,
  setEmployerAction,
  type ActionResult,
} from "@/lib/repos/pipeline";
import type { JobInput } from "@/lib/forms";
import type { EmploymentType } from "@/lib/taxonomy";

export async function createJobAction(input: JobInput) {
  const user = await requireRole("employer");
  const business = await getBusinessByOwner(user.uid);
  if (!business) redirect("/employer/onboarding");

  const { job } = await createAndPublishJob({
    businessId: business.id,
    ownerId: user.uid,
    businessName: business.name,
    businessVerified: business.verificationStatus === "verified",
    role: input.role,
    area: input.area,
    employmentType: input.employmentType as EmploymentType,
    salaryType: input.salaryType,
    salaryMin: input.salaryMin,
    salaryMax: input.salaryMax,
    minimumExperience: input.minimumExperience,
    skills: input.skills,
    languages: input.languages,
    desiredStartDate: input.desiredStartDate,
    description: input.description,
  });

  // Scoring the pool is unbounded work — it grows with the candidate base, not
  // with this request. Run it after the response so publishing stays fast; the
  // job carries shortlistStatus: "pending" until it completes, and the job page
  // polls for readiness.
  after(async () => {
    try {
      await generateShortlist(job);
    } catch (error) {
      // generateShortlist already marked the job failed; nothing is awaiting
      // this, so log rather than rethrow into a dead promise.
      console.error(`Shortlist generation failed for job ${job.id}`, error);
    }
  });

  redirect(`/employer/jobs/${job.id}?published=1`);
}

/** Guard: the acting employer must own the job. */
async function assertOwnsJob(jobId: string, uid: string) {
  const job = await getJob(jobId);
  if (!job || job.ownerId !== uid) throw new Error("Not allowed");
  return job;
}

export async function employerActionOnCandidate(
  jobId: string,
  candidateId: string,
  action: "passed" | "saved" | "invited",
): Promise<ActionResult> {
  const user = await requireRole("employer");
  await assertOwnsJob(jobId, user.uid);
  const res = await setEmployerAction(jobId, candidateId, action);
  revalidatePath(`/employer/jobs/${jobId}`);
  revalidatePath("/employer/matches");
  return res;
}

/**
 * Invite a candidate discovered through Find Candidates (§18). Creates the
 * shortlist row first if this candidate wasn't in the job's generated pool.
 */
export async function inviteFromSearchAction(
  jobId: string,
  candidateId: string,
): Promise<ActionResult> {
  const user = await requireRole("employer");
  await assertOwnsJob(jobId, user.uid);
  await ensureShortlistEntry(jobId, candidateId);
  const res = await setEmployerAction(jobId, candidateId, "invited");
  revalidatePath("/employer/candidates");
  revalidatePath(`/employer/jobs/${jobId}`);
  revalidatePath("/employer/matches");
  return res;
}

export async function markHiredAction(jobId: string, candidateId: string) {
  const user = await requireRole("employer");
  await assertOwnsJob(jobId, user.uid);
  await markHired(jobId, candidateId);
  revalidatePath(`/employer/jobs/${jobId}`);
}
