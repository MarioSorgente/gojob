import "server-only";
import { createHash } from "node:crypto";
import { adminDb } from "./firebase/admin";
import { COLLECTIONS } from "./collections";
import { dispatchRecommendationWorker } from "./recommendationDispatch";
import type { CandidateProfile } from "./types";

/** A stable digest of only fields consumed by computeMatch. */
export function candidateMatchingFingerprint(
  candidate?: CandidateProfile,
): string {
  if (!candidate) return "";
  return createHash("sha256")
    .update(
      JSON.stringify({
        roles: candidate.roles,
        area: candidate.area,
        employmentTypes: candidate.employmentTypes,
        salary: candidate.salary,
        availability: candidate.availability,
        languages: candidate.languages,
        skills: candidate.skills,
        experiences: candidate.experiences,
        profileStrength: candidate.profileStrength,
      }),
    )
    .digest("hex");
}

async function enqueue(kind: "candidate" | "job", entityId: string) {
  await adminDb()
    .collection(COLLECTIONS.recommendationTasks)
    .doc(`${kind}-${entityId}`)
    .set(
      {
        kind,
        entityId,
        status: "queued",
        enqueuedAt: new Date().toISOString(),
        attempts: 0,
        error: null,
      },
      { merge: true },
    );

  // The Firestore write above is the durable handoff. A dispatch outage must
  // not make the candidate/job mutation fail; the daily cron retains recovery.
  await dispatchRecommendationWorker().catch((error) => {
    console.error(
      JSON.stringify({
        event: "recommendation_dispatch_failure",
        kind,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  });
}

export const enqueueCandidateRecommendations = (candidateId: string) =>
  enqueue("candidate", candidateId);
export const enqueueJobRecommendations = (jobId: string) =>
  enqueue("job", jobId);
