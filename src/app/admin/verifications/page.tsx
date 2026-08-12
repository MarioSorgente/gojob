import {
  listAllBusinesses,
  listAllCandidateProfiles,
} from "@/lib/repos/admin";
import { Badge, Card, EmptyState } from "@/components/ui";
import { ReviewButtons } from "@/components/admin/ReviewButtons";

/** Manual verification queues (scope §5, §30, §31). */
export default async function VerificationsPage() {
  const [candidates, businesses] = await Promise.all([
    listAllCandidateProfiles(),
    listAllBusinesses(),
  ]);

  const pendingIds = candidates.filter((c) => c.verification?.id === "pending");
  const pendingEmployment = candidates.filter(
    (c) => c.verification?.employment === "pending",
  );
  const pendingBusinesses = businesses.filter(
    (b) => b.verificationStatus === "pending",
  );

  const nothingPending =
    !pendingIds.length && !pendingEmployment.length && !pendingBusinesses.length;

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Verification queue</h1>
      <p className="mb-5 text-sm text-muted">
        Light-touch manual review — candidates keep using GoJob either way.
      </p>

      {nothingPending && (
        <EmptyState icon="✅" title="Nothing to review" hint="The queue is empty." />
      )}

      {pendingIds.length > 0 && (
        <Section title={`ID verification (${pendingIds.length})`}>
          {pendingIds.map((c) => (
            <Card key={c.userId} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {c.firstName} {c.lastName}
                </p>
                <p className="truncate text-xs text-muted">
                  📍 {c.area} · {c.roles.join(", ") || "—"}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {c.idDocumentPath ? `📎 ${c.idDocumentPath}` : "No document attached"}
                </p>
              </div>
              <ReviewButtons kind="candidateId" id={c.userId} />
            </Card>
          ))}
        </Section>
      )}

      {pendingEmployment.length > 0 && (
        <Section title={`Workplace verification (${pendingEmployment.length})`}>
          {pendingEmployment.map((c) => (
            <Card key={c.userId} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {c.firstName} {c.lastName}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {c.experiences
                    .filter((e) => e.verificationStatus === "pending")
                    .map((e) => (
                      <li key={e.id} className="truncate text-xs text-muted">
                        {e.role} @ {e.companyName}
                      </li>
                    ))}
                </ul>
              </div>
              <ReviewButtons kind="employment" id={c.userId} />
            </Card>
          ))}
        </Section>
      )}

      {pendingBusinesses.length > 0 && (
        <Section title={`Business verification (${pendingBusinesses.length})`}>
          {pendingBusinesses.map((b) => (
            <Card key={b.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{b.name}</p>
                <p className="truncate text-xs text-muted">
                  {b.category} · 📍 {b.area}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {b.googleMapsUrl || b.website || b.instagram || "No links provided"}
                </p>
              </div>
              <ReviewButtons kind="business" id={b.id} />
            </Card>
          ))}
        </Section>
      )}

      <Section title="Recently decided">
        {candidates
          .filter((c) => ["verified", "rejected"].includes(c.verification?.id ?? ""))
          .slice(0, 8)
          .map((c) => (
            <div
              key={c.userId}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2 text-sm"
            >
              <span className="truncate">
                {c.firstName} {c.lastName}
              </span>
              <Badge tone={c.verification.id === "verified" ? "green" : "red"}>
                ID {c.verification.id}
              </Badge>
            </div>
          ))}
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
