import { listAllBusinesses } from "@/lib/repos/admin";
import { Badge, Card, EmptyState } from "@/components/ui";
import { ReviewButtons } from "@/components/admin/ReviewButtons";

const tone = {
  verified: "green",
  pending: "amber",
  rejected: "red",
  not_submitted: "slate",
} as const;

export default async function AdminBusinessesPage() {
  const businesses = await listAllBusinesses();

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Businesses</h1>
      <p className="mb-5 text-sm text-muted">{businesses.length} total</p>

      {businesses.length === 0 ? (
        <EmptyState icon="🏝️" title="No businesses yet" />
      ) : (
        <div className="space-y-2">
          {businesses.map((b) => (
            <Card key={b.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{b.name}</p>
                  <Badge tone={tone[b.verificationStatus]}>{b.verificationStatus}</Badge>
                </div>
                <p className="truncate text-xs text-muted">
                  {b.category} · 📍 {b.area}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {[b.instagram, b.website, b.googleMapsUrl].filter(Boolean).join(" · ") ||
                    "No links"}
                </p>
              </div>
              {b.verificationStatus !== "verified" && (
                <ReviewButtons kind="business" id={b.id} />
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
