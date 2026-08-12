import { requireRole } from "@/lib/auth";
import { listCandidateInvitations } from "@/lib/repos/pipeline";
import { formatSalaryRange } from "@/lib/cn";
import { Card, EmptyState, PageTitle } from "@/components/ui";
import { ReasonList } from "@/components/cards/match";
import { InvitationActions } from "@/components/candidate/InvitationActions";

export default async function InvitationsPage() {
  const user = await requireRole("candidate");
  const invites = await listCandidateInvitations(user.uid);

  return (
    <>
      <PageTitle
        title="Invitations"
        subtitle="Businesses that want to speak with you"
      />
      {invites.length === 0 ? (
        <EmptyState
          icon="✨"
          title="No invitations yet"
          hint="Keep your profile strong — employers can invite you directly."
        />
      ) : (
        <div className="space-y-3">
          {invites.map(({ entry, job }) => (
            <Card key={job.id} className="p-4">
              <p className="text-sm text-muted">
                <span className="font-semibold text-foreground">
                  {job.businessName}
                </span>{" "}
                would like to speak with you about
              </p>
              <h3 className="mt-0.5 text-lg font-bold">{job.role}</h3>
              <p className="mt-1 text-sm text-muted">
                📍 {job.area} · 💰{" "}
                {formatSalaryRange(job.salaryType, job.salaryMin, job.salaryMax) || "—"}
              </p>
              {entry.reasons.length > 0 && (
                <div className="mt-3">
                  <ReasonList reasons={entry.reasons} limit={3} />
                </div>
              )}
              <InvitationActions jobId={job.id} businessName={job.businessName} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
