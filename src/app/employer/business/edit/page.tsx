import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { BusinessForm } from "@/components/employer/BusinessForm";

export default async function EditBusinessPage() {
  const user = await requireRole("employer");
  const b = await getBusinessByOwner(user.uid);
  if (!b) redirect("/employer/onboarding");

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <Link href="/employer/business" className="text-sm text-muted">
        ← Back
      </Link>
      <h1 className="mt-2 mb-4 text-2xl font-bold">Edit venue</h1>
      <BusinessForm
        mode="edit"
        defaults={{
          name: b.name,
          category: b.category,
          area: b.area,
          address: b.address,
          instagram: b.instagram ?? "",
          website: b.website ?? "",
          googleMapsUrl: b.googleMapsUrl ?? "",
          description: b.description,
        }}
      />
    </div>
  );
}
