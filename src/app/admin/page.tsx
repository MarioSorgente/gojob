import Link from "next/link";
import { getMarketplaceMetrics } from "@/lib/repos/admin";
import { Card } from "@/components/ui";

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </Card>
  );
  return href ? (
    <Link href={href} className="block transition-transform hover:-translate-y-0.5">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default async function AdminOverview() {
  const m = await getMarketplaceMetrics();
  const pending = m.pendingIdVerifications + m.pendingBusinessVerifications;

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Marketplace overview</h1>
      <p className="mb-5 text-sm text-muted">
        The numbers that tell us whether the marketplace is working.
      </p>

      {pending > 0 && (
        <Link href="/admin/verifications" className="mb-4 block">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">
              {pending} item{pending === 1 ? "" : "s"} awaiting review →
            </p>
            <p className="text-sm text-amber-800">
              {m.pendingIdVerifications} ID · {m.pendingBusinessVerifications} business
            </p>
          </div>
        </Link>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
          Supply &amp; demand
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Candidates" value={m.candidates} href="/admin/users" />
          <Stat label="Employers" value={m.employers} href="/admin/users" />
          <Stat
            label="Businesses"
            value={m.businesses}
            hint={`${m.verifiedBusinesses} verified`}
            href="/admin/businesses"
          />
          <Stat
            label="Jobs"
            value={m.jobs}
            hint={`${m.liveJobs} live`}
            href="/admin/jobs"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
          Marketplace activity
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Applications" value={m.applications} />
          <Stat label="Invitations" value={m.invitations} />
          <Stat label="Matches" value={m.matches} />
          <Stat label="Hires" value={m.hires} />
          <Stat
            label="Matches / live job"
            value={m.matchesPerLiveJob}
            hint="liquidity"
          />
        </div>
      </section>
    </>
  );
}
