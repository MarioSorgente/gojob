import Link from "next/link";
import { redirect } from "next/navigation";
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
import { PageTitle } from "@/components/ui";
import { FilterBar, type FilterField } from "@/components/FilterBar";
import { CandidateResults } from "@/components/employer/CandidateResults";

const FIELDS: FilterField[] = [
  { name: "role", label: "Role", type: "select", options: ROLES },
  { name: "area", label: "Area", type: "select", options: AREAS },
  { name: "minExp", label: "Minimum years of experience", type: "number", placeholder: "2" },
  { name: "maxSalary", label: "Max monthly salary (IDR)", type: "number", placeholder: "8000000" },
  { name: "availability", label: "Availability", type: "select", options: AVAILABILITY_TYPES },
  { name: "employmentType", label: "Employment type", type: "select", options: EMPLOYMENT_TYPES },
  { name: "language", label: "Language", type: "select", options: LANGUAGES },
  { name: "level", label: "Minimum level", type: "select", options: PROFICIENCY_LEVELS },
  { name: "verified", label: "ID-verified only", type: "checkbox" },
];

export default async function FindCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("employer");
  const business = await getBusinessByOwner(user.uid);
  if (!business) redirect("/employer/onboarding");

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

  return (
    <>
      <PageTitle
        title="Find Candidates"
        subtitle="Browse the whole talent pool — no job post required."
      />
      <FilterBar fields={FIELDS} searchPlaceholder="Search name, skill, venue…" />

      {jobs.length === 0 && (
        <p className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Post a job first — invitations are always linked to a position.{" "}
          <Link href="/employer/jobs/new" className="font-semibold underline">
            Post a Job
          </Link>
        </p>
      )}

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
    </>
  );
}
