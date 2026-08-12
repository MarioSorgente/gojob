import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { recommendedJobsPage } from "@/lib/repos/jobs";
import { JobResults } from "@/components/candidate/JobResults";
import { PageTitle } from "@/components/ui";

export default async function CandidateHome() {
  const user = await requireRole("candidate");
  const candidate = await getCandidate(user.uid);
  if (!candidate) redirect("/candidate/onboarding");

  const firstPage = await recommendedJobsPage(candidate, {}, null);

  return (
    <>
      <PageTitle
        title={`Hi ${candidate.firstName || "there"} 👋`}
        subtitle="Jobs recommended for you"
      />
      <JobResults
        initialItems={firstPage.items}
        initialCursor={firstPage.nextCursor}
        filters={{}}
        emptyTitle="No open jobs yet"
        emptyHint="Check back soon — new hospitality jobs are posted every day."
      />
    </>
  );
}
