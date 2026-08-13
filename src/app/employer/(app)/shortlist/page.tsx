import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { listSavedForBusiness } from "@/lib/repos/shortlist";
import { ButtonLink, EmptyState, PageTitle, Section } from "@/components/ui";
import { ApplicantRow } from "@/components/employer/ApplicantRow";
import { InviteButton } from "@/components/employer/InviteButton";
import { UnsaveButton } from "@/components/employer/UnsaveButton";
import { MatchExplain } from "@/components/cards/MatchExplain";

export const metadata = { title: "Shortlist — GoJob" };

/**
 * Saved candidates across every job.
 *
 * Saving used to be one-way and buried in a collapsed section of a single job
 * page. This is the place to review them, grouped by the position they were
 * saved for, with the option to invite or put them back.
 */
export default async function ShortlistPage() {
  const user = await requireRole("employer");
  const business = await getBusinessByOwner(user.uid);
  if (!business) redirect("/employer/onboarding");

  const saved = await listSavedForBusiness(business.id);

  // Group by job so a row always says which position it was saved for.
  const byJob = new Map<string, { role: string; rows: typeof saved }>();
  for (const item of saved) {
    const existing = byJob.get(item.job.id);
    if (existing) existing.rows.push(item);
    else byJob.set(item.job.id, { role: item.job.role, rows: [item] });
  }

  return (
    <>
      <PageTitle
        title="Shortlist"
        subtitle={
          saved.length > 0
            ? `${saved.length} candidate${saved.length === 1 ? "" : "s"} saved for later`
            : "Candidates you save are kept here"
        }
      />

      {saved.length === 0 ? (
        <EmptyState
          icon="⭐"
          title="Nothing saved yet"
          hint="Tap Save on a candidate while reviewing a job and they'll wait for you here."
          action={<ButtonLink href="/employer">Review candidates</ButtonLink>}
        />
      ) : (
        <div className="space-y-6">
          {[...byJob.entries()].map(([jobId, { role, rows }]) => (
            <Section
              key={jobId}
              title={`${role} · ${rows.length}`}
              action={
                <Link
                  href={`/employer/jobs/${jobId}`}
                  className="rounded text-sm font-semibold text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  Open job
                </Link>
              }
            >
              <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                {rows.map(({ entry }) => (
                  <ApplicantRow
                    key={`${jobId}-${entry.candidateId}`}
                    summary={entry.candidateSummary}
                    scoreSlot={
                      <MatchExplain
                        score={entry.score}
                        breakdown={entry.breakdown}
                        reasons={entry.reasons}
                        audience="employer"
                      />
                    }
                    right={
                      <div className="flex flex-col gap-1.5">
                        <InviteButton
                          jobId={jobId}
                          candidateId={entry.candidateId}
                          name={entry.candidateSummary.firstName}
                        />
                        <UnsaveButton
                          jobId={jobId}
                          candidateId={entry.candidateId}
                          name={entry.candidateSummary.firstName}
                        />
                      </div>
                    }
                  />
                ))}
              </div>
            </Section>
          ))}
        </div>
      )}
    </>
  );
}
