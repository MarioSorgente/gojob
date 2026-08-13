import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { Badge, ButtonLink, Card, PageTitle } from "@/components/ui";
import { BusinessVerificationCard } from "@/components/employer/BusinessVerificationCard";

export default async function BusinessPage() {
  const user = await requireRole("employer");
  const b = await getBusinessByOwner(user.uid);
  if (!b) redirect("/employer/onboarding");

  return (
    <div className="space-y-4">
      <PageTitle title={b.name} subtitle={b.category} />

      <Card className="space-y-2 p-5">
        {b.verificationStatus === "verified" ? (
          <Badge tone="green">✓ Verified Business</Badge>
        ) : (
          <Badge tone="slate">Unverified Business</Badge>
        )}
        <p className="text-sm">
          📍 {b.area}
          {b.address ? ` · ${b.address}` : ""}
        </p>
        {b.description && <p className="text-sm text-slate-700">{b.description}</p>}
        <div className="space-y-1 pt-2 text-sm text-muted">
          {b.instagram && <p>📷 {b.instagram}</p>}
          {b.website && <p>🌐 {b.website}</p>}
          {b.googleMapsUrl && <p>🗺️ Google Maps linked</p>}
        </div>
      </Card>

      <BusinessVerificationCard
        uid={user.uid}
        name={b.name}
        logo={b.logo}
        status={b.verificationStatus}
      />

      <div className="grid grid-cols-2 gap-3">
        <ButtonLink href="/employer/business/edit" variant="outline" className="w-full">
          Edit venue
        </ButtonLink>
        <ButtonLink href="/employer/plans" variant="outline" className="w-full">
          Plans
        </ButtonLink>
      </div>
    </div>
  );
}
