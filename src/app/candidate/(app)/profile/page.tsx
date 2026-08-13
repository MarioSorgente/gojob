import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { computeProfileStrength } from "@/lib/profileStrength";
import { totalExperienceYears } from "@/lib/dates";
import { formatSalaryRange } from "@/lib/cn";
import { Avatar, Badge, ButtonLink, Card } from "@/components/ui";
import { ProfileStrengthCard } from "@/components/candidate/ProfileStrengthCard";

export default async function CandidateProfilePage() {
  const user = await requireRole("candidate");
  const c = await getCandidate(user.uid);
  if (!c) redirect("/candidate/onboarding");

  const strength = computeProfileStrength(c);
  const name = `${c.firstName} ${c.lastName}`.trim();
  const years = totalExperienceYears(c.experiences);

  return (
    <main className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(16rem,2fr)_minmax(0,3fr)] lg:items-start">
      <aside
        className="contents space-y-4 lg:block"
        aria-label="Profile summary"
      >
        <Card className="min-w-0 overflow-hidden p-5">
          <section aria-labelledby="profile-identity-heading">
            <div className="flex min-w-0 items-start gap-4">
              <div className="shrink-0">
                <Avatar name={name} photo={c.photo} size={64} />
              </div>
              <div className="min-w-0 flex-1">
                <h1
                  id="profile-identity-heading"
                  className="break-words text-xl font-bold [overflow-wrap:anywhere]"
                >
                  {name}
                </h1>
                <p className="break-words text-muted [overflow-wrap:anywhere]">
                  {c.roles[0] ?? "Hospitality"}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted">
                  <span className="break-words [overflow-wrap:anywhere]">
                    📍 {c.area}
                  </span>
                  <span className="break-words [overflow-wrap:anywhere]">
                    🟢 {c.availability.type.replace("Available ", "")}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-3" aria-label="Verification status">
            <div className="flex flex-wrap gap-2">
              {c.verification.phone === "verified" && (
                <Badge tone="green">✓ Phone</Badge>
              )}
              {c.verification.id === "verified" && (
                <Badge tone="green">✓ ID</Badge>
              )}
              {c.verification.employment === "verified" && (
                <Badge tone="green">✓ Employment</Badge>
              )}
            </div>
          </section>
        </Card>

        <section className="mt-4" aria-label="Profile strength">
          <ProfileStrengthCard strength={strength} />
        </section>

        <Card className="mt-4 p-5">
          <section aria-labelledby="preferences-heading">
            <h2
              id="preferences-heading"
              className="mb-2 text-sm font-bold uppercase tracking-wide text-muted"
            >
              Looking for
            </h2>
            <div className="flex flex-wrap gap-2">
              {c.roles.map((r) => (
                <Badge key={r} tone="brand">
                  {r}
                </Badge>
              ))}
            </div>
            <p className="mt-3 break-words text-sm [overflow-wrap:anywhere]">
              💰{" "}
              {formatSalaryRange(c.salary.type, c.salary.min, c.salary.max) ||
                "Not set"}
            </p>
            {c.employmentTypes.length > 0 && (
              <p className="mt-1 break-words text-sm text-muted [overflow-wrap:anywhere]">
                {c.employmentTypes.join(" · ")}
              </p>
            )}
          </section>
        </Card>

        {c.skills.length > 0 && (
          <Card className="mt-4 p-5">
            <section aria-labelledby="skills-heading">
              <h2
                id="skills-heading"
                className="mb-2 text-sm font-bold uppercase tracking-wide text-muted"
              >
                Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {c.skills.map((s) => (
                  <Badge key={s.name} tone="slate">
                    {s.name}
                  </Badge>
                ))}
              </div>
            </section>
          </Card>
        )}

        {c.languages.length > 0 && (
          <Card className="mt-4 p-5">
            <section aria-labelledby="languages-heading">
              <h2
                id="languages-heading"
                className="mb-2 text-sm font-bold uppercase tracking-wide text-muted"
              >
                Languages
              </h2>
              <ul className="space-y-1 text-sm">
                {c.languages.map((l) => (
                  <li
                    key={l.language}
                    className="flex flex-wrap justify-between gap-x-3"
                  >
                    <span className="break-words [overflow-wrap:anywhere]">
                      {l.language}
                    </span>
                    <span className="text-muted">{l.level}</span>
                  </li>
                ))}
              </ul>
            </section>
          </Card>
        )}

        <nav
          className="order-2 mt-4 flex flex-wrap gap-3"
          aria-label="Profile actions"
        >
          <ButtonLink
            href="/candidate/edit"
            variant="outline"
            className="min-w-0 flex-[1_1_10rem]"
          >
            Edit profile
          </ButtonLink>
          <ButtonLink
            href="/candidate/verification"
            variant="outline"
            className="min-w-0 flex-[1_1_10rem]"
          >
            Verification
          </ButtonLink>
        </nav>
      </aside>

      <div className="order-1 min-w-0 lg:order-none">
        <Card className="p-5">
          <section aria-labelledby="experience-heading">
            <h2
              id="experience-heading"
              className="mb-2 text-sm font-bold uppercase tracking-wide text-muted"
            >
              Experience · {years} yr{years === 1 ? "" : "s"}
            </h2>
            {c.experiences.length === 0 ? (
              <p className="text-sm text-muted">No experience added yet.</p>
            ) : (
              <ul className="space-y-3">
                {c.experiences.map((e) => (
                  <li
                    key={e.id}
                    className="min-w-0 border-l-2 border-brand-soft pl-3"
                  >
                    <p className="break-words font-semibold [overflow-wrap:anywhere]">
                      {e.role}
                    </p>
                    <p className="break-words text-sm text-muted [overflow-wrap:anywhere]">
                      {e.companyName} · {e.startDate?.slice(0, 7)}
                      {" – "}
                      {e.current ? "Present" : (e.endDate?.slice(0, 7) ?? "")}
                    </p>
                    {e.description && (
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-600 [overflow-wrap:anywhere]">
                        {e.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Card>
      </div>
    </main>
  );
}
