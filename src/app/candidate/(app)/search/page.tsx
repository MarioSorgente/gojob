import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { searchJobsForCandidate } from "@/lib/repos/jobs";
import { AREAS, EMPLOYMENT_TYPES, ROLES } from "@/lib/taxonomy";
import { EmptyState, PageTitle } from "@/components/ui";
import { FilterBar, type FilterField } from "@/components/FilterBar";
import { JobCard } from "@/components/cards/JobCard";

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
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const minSalaryRaw = one("minSalary");

  const results = await searchJobsForCandidate(candidate, {
    role: one("role"),
    area: one("area"),
    employmentType: one("employmentType"),
    minSalary: minSalaryRaw ? Number(minSalaryRaw) || undefined : undefined,
    query: one("q"),
  });

  return (
    <>
      <PageTitle title="Search jobs" subtitle="All open jobs, ranked for you" />
      <FilterBar fields={FIELDS} searchPlaceholder="Search role, venue, area…" />

      <p className="mb-2 text-sm text-muted">
        {results.length} job{results.length === 1 ? "" : "s"}
      </p>

      {results.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No jobs match those filters"
          hint="Try clearing a filter or widening the area."
        />
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <JobCard
              key={r.job.id}
              job={r.job}
              score={r.score}
              reasons={r.reasons}
              href={`/candidate/jobs/${r.job.id}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
