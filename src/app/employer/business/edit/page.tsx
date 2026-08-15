import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { BusinessForm } from "@/components/employer/BusinessForm";
import { BackLink } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

export default async function EditBusinessPage() {
  const user = await requireRole("employer");
  const b = await getBusinessByOwner(user.uid);
  if (!b) redirect("/employer/onboarding");

  const t = await getT();

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <BackLink href="/employer/business">{t("nav.venue")}</BackLink>
      <h1 className="type-title mb-4 mt-2">{t("employer.editVenue")}</h1>
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
    </main>
  );
}
