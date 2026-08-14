import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { recommendedJobsPage } from "@/lib/repos/jobs";
import { listCandidateActions } from "@/lib/repos/pipeline";
import { AREAS, EMPLOYMENT_TYPES, ROLES } from "@/lib/taxonomy";
import { getI18n } from "@/lib/i18n/server";
import {
  areaLabel,
  employmentTypeLabel,
  options,
  roleLabel,
} from "@/lib/i18n/taxonomy";
import { PageTitle } from "@/components/ui";
import { FilterBar, FilterRail, type FilterField } from "@/components/FilterBar";
import { JobResults } from "@/components/candidate/JobResults";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("filter.searchJobs") };
}

export default async function CandidateJobSearch({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("candidate");
  const candidate = await getCandidate(user.uid);
  if (!candidate) redirect("/candidate/onboarding");

  const { locale, t } = await getI18n();
  const sp = await searchParams;
  const one = (k: string) =>
    typeof sp[k] === "string" ? (sp[k] as string) : undefined;
  const minSalaryRaw = one("minSalary");

  const filters = {
    role: one("role"),
    area: one("area"),
    employmentType: one("employmentType"),
    minSalary: minSalaryRaw ? Number(minSalaryRaw) || undefined : undefined,
    query: one("q"),
  };

  const [firstPage, actions] = await Promise.all([
    recommendedJobsPage(candidate, filters, null),
    // So the feed can mark what the candidate has already applied to or passed
    // on, instead of offering the same dead ends every visit.
    listCandidateActions(user.uid).catch(() => ({})),
  ]);

  // `value` stays the canonical English stored in Firestore; only `label` is
  // translated. See src/lib/i18n/taxonomy.ts.
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
    {
      name: "employmentType",
      label: t("filter.employmentType"),
      type: "select",
      options: options(EMPLOYMENT_TYPES, locale, employmentTypeLabel),
    },
    {
      name: "minSalary",
      label: t("filter.minSalary"),
      type: "number",
      placeholder: t("filter.minSalaryPlaceholder"),
    },
  ];

  return (
    <>
      <PageTitle
        title={t("filter.searchJobs")}
        subtitle={t("filter.searchJobsSubtitle")}
      />

      <FilterBar
        fields={fields}
        areaField={areaField}
        searchPlaceholder={t("filter.keywordPlaceholder")}
      />

      {/* Persistent filter rail from lg up — the layout JobStreet uses, and the
          reason the collapsed "Filters" button is now mobile-only. */}
      <div className="flex gap-6">
        <FilterRail fields={fields} />
        <div className="min-w-0 flex-1">
          <JobResults
            initialItems={firstPage.items}
            initialCursor={firstPage.nextCursor}
            filters={filters}
            label={t("filter.results")}
            emptyTitle={t("filter.noResults")}
            emptyHint={t("filter.noResultsHint")}
            actions={actions}
          />
        </div>
      </div>
    </>
  );
}
