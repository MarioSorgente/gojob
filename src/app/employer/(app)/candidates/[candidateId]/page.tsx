import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { listJobsByBusiness } from "@/lib/repos/jobs";
import { totalExperienceYears } from "@/lib/dates";
import { formatSalaryRange } from "@/lib/cn";
import { Avatar, Badge, Card } from "@/components/ui";
import { InviteToJobButton } from "@/components/employer/InviteToJobButton";

/**
 * Employer's read-only view of a candidate (scope §18): no phone, no email —
 * contact details stay hidden until the candidate accepts an invitation.
 */
export default async function EmployerCandidateProfile({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  const user = await requireRole("employer");
  const business = await getBusinessByOwner(user.uid);
  if (!business) redirect("/employer/onboarding");

  const c = await getCandidate(candidateId);
  if (!c) notFound();

  const jobs = (await listJobsByBusiness(business.id))
    .filter((j) => j.status === "live")
    .map((j) => ({ id: j.id, role: j.role }));

  const name = `${c.firstName} ${c.lastName}`.trim();
  const years = totalExperienceYears(c.experiences);

  return (
    <div className="space-y-4">
      <Link href="/employer/candidates" className="text-sm text-muted">
        ← Find Candidates
      </Link>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar name={name} photo={c.photo} size={64} />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{name}</h1>
            <p className="text-muted">{c.roles[0] ?? "Hospitality"}</p>
            <p className="mt-1 text-sm text-muted">
              📍 {c.area} · 🟢 {c.availability.type.replace("Available ", "")}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {c.verification.phone === "verified" && <Badge tone="green">✓ Phone</Badge>}
          {c.verification.id === "verified" && <Badge tone="green">✓ ID</Badge>}
          {c.verification.employment === "verified" && (
            <Badge tone="green">✓ Employment</Badge>
          )}
          <Badge tone="brand">{c.profileStrength}% profile</Badge>
        </div>
        <p className="mt-3 font-semibold">
          💰 {formatSalaryRange(c.salary.type, c.salary.min, c.salary.max) || "—"}
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
          Experience · {years} yr{years === 1 ? "" : "s"}
        </h2>
        {c.experiences.length === 0 ? (
          <p className="text-sm text-muted">No experience listed.</p>
        ) : (
          <ul className="space-y-3">
            {c.experiences.map((e) => (
              <li key={e.id} className="border-l-2 border-brand-soft pl-3">
                <p className="font-semibold">{e.role}</p>
                <p className="text-sm text-muted">
                  {e.companyName} · {e.startDate?.slice(0, 7)} –{" "}
                  {e.current ? "Present" : (e.endDate?.slice(0, 7) ?? "")}
                  {e.verificationStatus === "verified" && " · ✓ verified"}
                </p>
                {e.description && (
                  <p className="mt-0.5 text-sm text-slate-600">{e.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {c.skills.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {c.skills.map((s) => (
              <Badge key={s.name} tone="slate">
                {s.name}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {c.languages.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
            Languages
          </h2>
          <ul className="space-y-1 text-sm">
            {c.languages.map((l) => (
              <li key={l.language} className="flex justify-between">
                <span>{l.language}</span>
                <span className="text-muted">{l.level}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        <p className="mb-3 text-center text-sm text-muted">
          🔒 Contact details unlock when {c.firstName} accepts your invitation.
        </p>
        <div className="flex justify-center">
          <InviteToJobButton
            candidateId={c.userId}
            name={c.firstName}
            jobs={jobs}
            size="lg"
          />
        </div>
      </Card>
    </div>
  );
}
