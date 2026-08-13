import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { recommendedJobsPage } from "@/lib/repos/jobs";
import { AREAS, EMPLOYMENT_TYPES, ROLES } from "@/lib/taxonomy";
import { PageTitle } from "@/components/ui";
import { FilterBar, type FilterField } from "@/components/FilterBar";
import { JobResults } from "@/components/candidate/JobResults";

const FIELDS: FilterField[] = [
  { name: "role", label: "Role", type: "select", options: ROLES },
  { name: "area", label: "Area", type: "select", options: AREAS },
  {
    name: "employmentType",
    label: "Employment type",
    type: "select",
    options: EMPLOYMENT_TYPES,
  },
  {
    name: "minSalary",
    label: "Minimum salary (IDR)",
    type: "number",
    placeholder: "6000000",
  },
];

export default async function CandidateJobSearch({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("candidate");
  const candidate = await getCandidate(user.uid);
  if (!candidate) redirect("/candidate/onboarding");

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

  const firstPage = await recommendedJobsPage(candidate, filters, null);

  return (
    <>
      <PageTitle title="Search jobs" subtitle="All open jobs, ranked for you" />
      <section aria-label="Search filters and results">
        <FilterBar
          fields={FIELDS}
          searchPlaceholder="Search role, venue, area…"
        />
        <JobResults
          initialItems={firstPage.items}
          initialCursor={firstPage.nextCursor}
          filters={filters}
          label="Search results"
          emptyTitle="No jobs match those filters"
          emptyHint="Try clearing a filter or widening the area."
        />
      </section>
    </>
  );
}
