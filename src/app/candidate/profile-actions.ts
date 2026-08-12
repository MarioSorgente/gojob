"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  getCandidate,
  setCandidateVerification,
  upsertCandidate,
} from "@/lib/repos/candidates";
import { assertOwnedStorageReference } from "@/lib/storagePaths";

/**
 * Save a newly uploaded profile photo URL (also lifts profile strength).
 *
 * The URL arrives from the client, so it is re-checked against this session's
 * uid: storage.rules governs who may *write* an object, but nothing stops a
 * caller posting somebody else's object path — or an off-site URL — into their
 * own profile, where it would then be rendered to other users.
 */
export async function updatePhotoAction(url: string) {
  const user = await requireRole("candidate");
  assertOwnedStorageReference(url, user.uid, "public");
  await upsertCandidate(user.uid, { photo: url });
  revalidatePath("/candidate/profile");
  revalidatePath("/candidate/verification");
}

/** Candidate submitted an ID document — queue it for admin review (scope §5). */
export async function submitIdVerificationAction(storagePath: string) {
  const user = await requireRole("candidate");
  assertOwnedStorageReference(storagePath, user.uid, "private");
  await upsertCandidate(user.uid, { idDocumentPath: storagePath });
  await setCandidateVerification(user.uid, "id", "pending");
  revalidatePath("/candidate/verification");
  revalidatePath("/candidate/profile");
}

/** Candidate asks GoJob to verify a past workplace. Handled manually in admin. */
export async function requestEmploymentVerificationAction(experienceId: string) {
  const user = await requireRole("candidate");
  const candidate = await getCandidate(user.uid);
  if (!candidate) throw new Error("Profile not found");

  const experiences = candidate.experiences.map((e) =>
    e.id === experienceId ? { ...e, verificationStatus: "pending" as const } : e,
  );
  await upsertCandidate(user.uid, { experiences });
  await setCandidateVerification(user.uid, "employment", "pending");
  revalidatePath("/candidate/verification");
  revalidatePath("/candidate/profile");
}
