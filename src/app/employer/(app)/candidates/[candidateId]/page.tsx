import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { listJobsByBusiness } from "@/lib/repos/jobs";
import { totalExperienceYears } from "@/lib/dates";
import { formatMonthYear, formatSalary } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import {
  areaLabel,
  availabilityLabel,
  languageLabel,
  proficiencyLabel,
  roleLabel,
} from "@/lib/i18n/taxonomy";
import { Alert, Avatar, BackLink, Badge, Card, Section } from "@/components/ui";
import { Icon } from "@/components/Icon";
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

  const { locale, t } = await getI18n();
  const jobs = (await listJobsByBusiness(business.id))
    .filter((j) => j.status === "live")
    .map((j) => ({ id: j.id, role: j.role }));

  const name = `${c.firstName} ${c.lastName}`.trim();
  const years = totalExperienceYears(c.experiences);

  return (
    <div className="space-y-4">
      <BackLink href="/employer/candidates">{t("employer.findCandidates")}</BackLink>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar name={name} photo={c.photo} size={64} />
          <div className="min-w-0">
            <h1 className="type-title truncate">{name}</h1>
            <p className="text-muted">
              {c.roles[0] ? roleLabel(c.roles[0], locale) : ""}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <Icon name="mapPin" className="h-4 w-4" />
                {areaLabel(c.area, locale)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon name="clock" className="h-4 w-4" />
                {availabilityLabel(c.availability.type, locale)}
              </span>
            </p>
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
          <Badge tone="brand">
            {c.profileStrength}% {t("candidate.profileStrength")}
          </Badge>
        </div>

        <p className="mt-4 inline-flex items-center gap-2 font-semibold">
          <Icon name="wallet" className="h-4 w-4 text-muted" />
          {formatSalary(c.salary.type, c.salary.min, c.salary.max, locale) ||
            t("job.salaryUndisclosed")}
        </p>
      </Card>

      <Card className="p-5">
        <Section title={`${t("candidate.experience")} · ${years}`}>
          {c.experiences.length === 0 ? (
            <p className="text-sm text-muted">{t("common.notSet")}</p>
          ) : (
            <ul className="space-y-3">
              {c.experiences.map((e) => (
                <li key={e.id} className="border-l-2 border-brand-soft pl-3">
                  <p className="font-semibold">{e.role}</p>
                  <p className="flex flex-wrap items-center gap-1 text-sm text-muted">
                    {e.companyName} · {formatMonthYear(e.startDate, locale)} –{" "}
                    {e.current
                      ? t("candidate.present")
                      : formatMonthYear(e.endDate, locale)}
                    {e.verificationStatus === "verified" && (
                      <Icon
                        name="checkBadge"
                        className="h-3.5 w-3.5 text-success"
                        title={t("common.verified")}
                      />
                    )}
                  </p>
                  {e.description && (
                    <p className="mt-0.5 text-sm text-subtle">{e.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </Card>

      {c.skills.length > 0 && (
        <Card className="p-5">
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
        <Card className="p-5">
          <Section title={t("job.languages")}>
            <ul className="space-y-1 text-sm">
              {c.languages.map((l) => (
                <li key={l.language} className="flex justify-between gap-3">
                  <span>{languageLabel(l.language, locale)}</span>
                  <span className="text-muted">
                    {proficiencyLabel(l.level, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </Card>
      )}

      <Card className="p-4">
        <Alert tone="info" className="mb-3">
          {t("employer.contactHidden")}
        </Alert>
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
