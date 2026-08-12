import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { JobForm } from "@/components/employer/JobForm";

export default async function NewJobPage() {
  const user = await requireRole("employer");
  const business = await getBusinessByOwner(user.uid);
  if (!business) redirect("/employer/onboarding");

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <Link href="/employer" className="text-sm text-muted">
        ← Cancel
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Post a Job</h1>
      <p className="mt-1 mb-4 text-sm text-muted">
        Publish and instantly see matching candidates.
      </p>
      <JobForm businessArea={business.area} />
    </div>
  );
}
