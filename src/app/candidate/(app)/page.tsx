import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { recommendedJobsForCandidate } from "@/lib/repos/jobs";
import { JobCard } from "@/components/cards/JobCard";
import { EmptyState, PageTitle } from "@/components/ui";

export default async function CandidateHome() {
  const user = await requireRole("candidate");
  const candidate = await getCandidate(user.uid);
  if (!candidate) redirect("/candidate/onboarding");

  const recs = await recommendedJobsForCandidate(candidate);

  return (
    <>
      <PageTitle
        title={`Hi ${candidate.firstName || "there"} 👋`}
        subtitle="Jobs recommended for you"
      />
      {recs.length === 0 ? (
        <EmptyState
          icon="🔎"
          title="No open jobs yet"
          hint="Check back soon — new hospitality jobs are posted every day."
        />
      ) : (
        <div className="space-y-3">
          {recs.map((r) => (
            <JobCard
              key={r.job.id}
              job={r.job}
              score={r.score}
              reasons={r.reasons}
              href={`/candidate/jobs/${r.job.id}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
