import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { computeProfileStrength } from "@/lib/profileStrength";
import { totalExperienceYears } from "@/lib/dates";
import { formatMonthYear, formatSalary } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import {
  areaLabel,
  availabilityLabel,
  employmentTypeLabel,
  languageLabel,
  proficiencyLabel,
  roleLabel,
} from "@/lib/i18n/taxonomy";
import { Avatar, Badge, ButtonLink, Card, Section } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ProfileStrengthCard } from "@/components/candidate/ProfileStrengthCard";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("candidate.profileTitle") };
}

export default async function CandidateProfilePage() {
  const user = await requireRole("candidate");
  const c = await getCandidate(user.uid);
  if (!c) redirect("/candidate/onboarding");

  const { locale, t } = await getI18n();
  const strength = computeProfileStrength(c);
  const name = `${c.firstName} ${c.lastName}`.trim();
  const years = totalExperienceYears(c.experiences);

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(16rem,2fr)_minmax(0,3fr)] lg:items-start">
      <aside className="contents space-y-4 lg:block" aria-label={t("candidate.profileTitle")}>
        <Card className="min-w-0 overflow-hidden p-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="shrink-0">
              <Avatar name={name} photo={c.photo} size={64} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="type-title break-words [overflow-wrap:anywhere]">
                {name}
              </h1>
              <p className="break-words text-muted [overflow-wrap:anywhere]">
                {c.roles[0] ? roleLabel(c.roles[0], locale) : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1">
                  <Icon name="mapPin" className="h-4 w-4" />
                  {areaLabel(c.area, locale)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="clock" className="h-4 w-4" />
                  {availabilityLabel(c.availability.type, locale)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {c.verification.phone === "verified" && (
              <Badge tone="green">
                <Icon name="checkBadge" className="h-3.5 w-3.5" />
                {t("auth.phone")}
              </Badge>
            )}
            {c.verification.id === "verified" && (
              <Badge tone="green">
                <Icon name="checkBadge" className="h-3.5 w-3.5" />
                ID
              </Badge>
            )}
            {c.verification.employment === "verified" && (
              <Badge tone="green">
                <Icon name="checkBadge" className="h-3.5 w-3.5" />
                {t("candidate.experience")}
              </Badge>
            )}
          </div>
        </Card>

        <div className="mt-4 lg:mt-4">
          <ProfileStrengthCard strength={strength} t={t} />
        </div>

        <Card className="mt-4 p-5">
          <Section title={t("candidate.desiredRoles")}>
            <div className="flex flex-wrap gap-2">
              {c.roles.map((r) => (
                <Badge key={r} tone="brand">
                  {roleLabel(r, locale)}
                </Badge>
              ))}
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 break-words text-sm [overflow-wrap:anywhere]">
              <Icon name="wallet" className="h-4 w-4 text-muted" />
              {formatSalary(c.salary.type, c.salary.min, c.salary.max, locale) ||
                t("common.notSet")}
            </p>
            {c.employmentTypes.length > 0 && (
              <p className="mt-1 break-words text-sm text-muted [overflow-wrap:anywhere]">
                {c.employmentTypes
                  .map((e) => employmentTypeLabel(e, locale))
                  .join(" · ")}
              </p>
            )}
          </Section>
        </Card>

        {c.skills.length > 0 && (
          <Card className="mt-4 p-5">
            <Section title={t("candidate.skills")}>
              <div className="flex flex-wrap gap-2">
                {c.skills.map((s) => (
                  <Badge key={s.name} tone="slate">
                    {s.name}
                  </Badge>
                ))}
              </div>
            </Section>
          </Card>
        )}

        {c.languages.length > 0 && (
          <Card className="mt-4 p-5">
            <Section title={t("job.languages")}>
              <ul className="space-y-1 text-sm">
                {c.languages.map((l) => (
                  <li key={l.language} className="flex flex-wrap justify-between gap-x-3">
                    <span className="break-words [overflow-wrap:anywhere]">
                      {languageLabel(l.language, locale)}
                    </span>
                    <span className="text-muted">
                      {proficiencyLabel(l.level, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          </Card>
        )}

        <nav className="order-2 mt-4 flex flex-wrap gap-3" aria-label={t("common.edit")}>
          <ButtonLink
            href="/candidate/edit"
            variant="outline"
            className="min-w-0 flex-[1_1_10rem]"
          >
            {t("candidate.editProfile")}
          </ButtonLink>
          <ButtonLink
            href="/candidate/verification"
            variant="outline"
            className="min-w-0 flex-[1_1_10rem]"
          >
            {t("candidate.verification")}
          </ButtonLink>
          {/* The applications list had no entry point anywhere in the app. */}
          <ButtonLink
            href="/candidate/applications"
            variant="outline"
            className="min-w-0 flex-[1_1_10rem]"
          >
            {t("nav.applications")}
          </ButtonLink>
        </nav>
      </aside>

      <div className="order-1 min-w-0 lg:order-none">
        <Card className="p-5">
          <Section title={`${t("candidate.experience")} · ${years}`}>
            {c.experiences.length === 0 ? (
              <p className="text-sm text-muted">{t("common.notSet")}</p>
            ) : (
              <ul className="space-y-3">
                {c.experiences.map((e) => (
                  <li key={e.id} className="min-w-0 border-l-2 border-brand-soft pl-3">
                    <p className="break-words font-semibold [overflow-wrap:anywhere]">
                      {e.role}
                    </p>
                    <p className="break-words text-sm text-muted [overflow-wrap:anywhere]">
                      {e.companyName} · {formatMonthYear(e.startDate, locale)}
                      {" – "}
                      {e.current
                        ? t("candidate.present")
                        : formatMonthYear(e.endDate, locale)}
                    </p>
                    {e.description && (
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-subtle [overflow-wrap:anywhere]">
                        {e.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </Card>
      </div>
    </div>
  );
}
