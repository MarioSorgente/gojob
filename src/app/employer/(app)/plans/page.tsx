import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { Alert, Badge, Button, Card, PageTitle } from "@/components/ui";
import { Icon } from "@/components/Icon";

/**
 * Monetization UI (scope §21). Deliberately presentational: no metering, no
 * payment provider. The data model is designed for it, but billing must not
 * block the marketplace prototype.
 */
interface Plan {
  id: string;
  name: string;
  price: string;
  unit: string;
  tagline: string;
  featured?: boolean;
  features: readonly string[];
}

const PLANS: readonly Plan[] = [
  {
    id: "per-job",
    name: "Pay per Job",
    price: "IDR 250K",
    unit: "per job post",
    tagline: "Hiring occasionally.",
    features: [
      "1 active job post",
      "Ranked candidate shortlist",
      "Swipe, save & invite",
      "Chat with matches",
    ],
  },
  {
    id: "pro",
    name: "GoJob Pro",
    price: "IDR 900K",
    unit: "per month",
    tagline: "Always hiring.",
    featured: true,
    features: [
      "Unlimited active jobs",
      "Full candidate search",
      "Proactive invitations",
      "Priority placement in recommendations",
      "Verified business badge review",
    ],
  },
];

export default async function PlansPage() {
  await requireRole("employer");

  return (
    <>
      <PageTitle title="Plans" subtitle="Candidates are always free. Employers pay to hire." />

      <Alert tone="info" className="mb-4">
        Preview only — billing isn&apos;t connected yet. Everything is unlocked
        during the pilot.
      </Alert>

      <div className="space-y-3">
        {PLANS.map((p) => (
          <Card
            key={p.id}
            className={p.featured ? "border-brand p-5 ring-2 ring-brand/20" : "p-5"}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">{p.name}</h2>
                <p className="text-sm text-muted">{p.tagline}</p>
              </div>
              {p.featured && <Badge tone="brand">Most popular</Badge>}
            </div>
            <p className="mt-3">
              <span className="text-2xl font-extrabold">{p.price}</span>{" "}
              <span className="text-sm text-muted">{p.unit}</span>
            </p>
            <ul className="mt-3 space-y-1.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-subtle">
                  <Icon name="check" className="mt-0.5 h-4 w-4 text-success" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant={p.featured ? "primary" : "outline"}
              className="mt-4 w-full"
              disabled
            >
              Coming soon
            </Button>
          </Card>
        ))}
      </div>

      <p className="mt-5 text-center text-sm text-muted">
        Questions about pricing?{" "}
        <Link href="/employer" className="font-semibold text-brand">
          Keep hiring for now
        </Link>{" "}
        — the pilot is free.
      </p>
    </>
  );
}
