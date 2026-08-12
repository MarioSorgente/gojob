import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { Badge, Card, PageTitle } from "@/components/ui";

export default async function BusinessPage() {
  const user = await requireRole("employer");
  const b = await getBusinessByOwner(user.uid);
  if (!b) redirect("/employer/onboarding");

  return (
    <>
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
        {b.description && (
          <p className="text-sm text-slate-700">{b.description}</p>
        )}
        <div className="space-y-1 pt-2 text-sm text-muted">
          {b.instagram && <p>📷 {b.instagram}</p>}
          {b.website && <p>🌐 {b.website}</p>}
          {b.googleMapsUrl && <p>🗺️ Google Maps linked</p>}
        </div>
      </Card>
    </>
  );
}
