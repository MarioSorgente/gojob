import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { computeProfileStrength } from "@/lib/profileStrength";
import { totalExperienceYears } from "@/lib/dates";
import { formatSalaryRange } from "@/lib/cn";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { ProfileStrengthCard } from "@/components/candidate/ProfileStrengthCard";

export default async function CandidateProfilePage() {
  const user = await requireRole("candidate");
  const c = await getCandidate(user.uid);
  if (!c) redirect("/candidate/onboarding");

  const strength = computeProfileStrength(c);
  const name = `${c.firstName} ${c.lastName}`.trim();
  const years = totalExperienceYears(c.experiences);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar name={name} photo={c.photo} size={64} />
          <div>
            <h1 className="text-xl font-bold">{name}</h1>
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
        </div>
      </Card>

      <ProfileStrengthCard strength={strength} />

      <Card className="p-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
          Looking for
        </h2>
        <div className="flex flex-wrap gap-2">
          {c.roles.map((r) => (
            <Badge key={r} tone="brand">
              {r}
            </Badge>
          ))}
        </div>
        <p className="mt-3 text-sm">
          💰 {formatSalaryRange(c.salary.type, c.salary.min, c.salary.max) || "Not set"}
        </p>
        {c.employmentTypes.length > 0 && (
          <p className="mt-1 text-sm text-muted">{c.employmentTypes.join(" · ")}</p>
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

      <Card className="p-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
          Experience · {years} yr{years === 1 ? "" : "s"}
        </h2>
        {c.experiences.length === 0 ? (
          <p className="text-sm text-muted">No experience added yet.</p>
        ) : (
          <ul className="space-y-3">
            {c.experiences.map((e) => (
              <li key={e.id} className="border-l-2 border-brand-soft pl-3">
                <p className="font-semibold">{e.role}</p>
                <p className="text-sm text-muted">
                  {e.companyName} · {e.startDate?.slice(0, 7)}
                  {" – "}
                  {e.current ? "Present" : e.endDate?.slice(0, 7) ?? ""}
                </p>
                {e.description && (
                  <p className="mt-0.5 text-sm text-slate-600">{e.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/candidate/edit">
          <Button variant="outline" className="w-full">
            Edit profile
          </Button>
        </Link>
        <Link href="/candidate/verification">
          <Button variant="outline" className="w-full">
            Verification
          </Button>
        </Link>
      </div>
    </div>
  );
}
