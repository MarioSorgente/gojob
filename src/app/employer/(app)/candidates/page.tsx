import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { searchCandidatesPage, toCandidateSummary } from "@/lib/repos/candidates";
import { listJobsByBusiness } from "@/lib/repos/jobs";
import {
  AREAS,
  AVAILABILITY_TYPES,
  EMPLOYMENT_TYPES,
  LANGUAGES,
  PROFICIENCY_LEVELS,
  ROLES,
} from "@/lib/taxonomy";
import { getI18n } from "@/lib/i18n/server";
import {
  areaLabel,
  availabilityLabel,
  employmentTypeLabel,
  languageLabel,
  options,
  proficiencyLabel,
  roleLabel,
} from "@/lib/i18n/taxonomy";
import { Alert, PageTitle, TextLink } from "@/components/ui";
import { FilterBar, FilterRail, type FilterField } from "@/components/FilterBar";
import { CandidateResults } from "@/components/employer/CandidateResults";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("employer.findCandidates") };
}

export default async function FindCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("employer");
  const business = await getBusinessByOwner(user.uid);
  if (!business) redirect("/employer/onboarding");

  const { locale, t } = await getI18n();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const num = (k: string) => {
    const v = one(k);
    return v ? Number(v) || undefined : undefined;
  };

  const filters = {
    role: one("role"),
    area: one("area"),
    minExperience: num("minExp"),
    maxSalary: num("maxSalary"),
    availability: one("availability"),
    employmentType: one("employmentType"),
    language: one("language"),
    minLanguageLevel: one("level"),
    verifiedOnly: one("verified") === "1",
    query: one("q"),
  };

  const firstPage = await searchCandidatesPage(filters, null);

  const jobs = (await listJobsByBusiness(business.id))
    .filter((j) => j.status === "live")
    .map((j) => ({ id: j.id, role: j.role }));

  // Option `value` stays the canonical English stored in Firestore; only the
  // visible `label` is translated.
  const areaField: FilterField = {
    name: "area",
    label: t("filter.area"),
    type: "select",
    options: options(AREAS, locale, areaLabel),
  };

  const fields: FilterField[] = [
    {
      name: "role",
      label: t("filter.role"),
      type: "select",
      options: options(ROLES, locale, roleLabel),
    },
    areaField,
    { name: "minExp", label: t("filter.minExperience"), type: "number", placeholder: "2" },
    {
      name: "maxSalary",
      label: t("filter.maxSalary"),
      type: "number",
      placeholder: "8000000",
    },
    {
      name: "availability",
      label: t("candidate.availability"),
      type: "select",
      options: options(AVAILABILITY_TYPES, locale, availabilityLabel),
    },
    {
      name: "employmentType",
      label: t("filter.employmentType"),
      type: "select",
      options: options(EMPLOYMENT_TYPES, locale, employmentTypeLabel),
    },
    {
      name: "language",
      label: t("job.languages"),
      type: "select",
      options: options(LANGUAGES, locale, languageLabel),
    },
    {
      name: "level",
      label: t("filter.minLanguageLevel"),
      type: "select",
      options: options(PROFICIENCY_LEVELS, locale, proficiencyLabel),
    },
    { name: "verified", label: t("filter.idVerifiedOnly"), type: "checkbox" },
  ];

  return (
    <>
      <PageTitle
        title={t("employer.findCandidates")}
        subtitle={t("employer.findSubtitle")}
      />

      <FilterBar
        fields={fields}
        areaField={areaField}
        searchPlaceholder={t("filter.keywordPlaceholder")}
      />

      {jobs.length === 0 && (
        <Alert tone="warning" className="mb-4">
          {t("employer.noJobsHint")}{" "}
          <TextLink href="/employer/jobs/new">{t("employer.postJob")}</TextLink>
        </Alert>
      )}

      <div className="flex gap-6">
        <FilterRail fields={fields} />
        <div className="min-w-0 flex-1">
          <CandidateResults
            initialItems={firstPage.items.map((c) => ({
              userId: c.userId,
              firstName: c.firstName,
              profileStrength: c.profileStrength,
              summary: toCandidateSummary(c),
            }))}
            initialCursor={firstPage.nextCursor}
            filters={filters}
            jobs={jobs}
          />
        </div>
      </div>
    </>
  );
}
