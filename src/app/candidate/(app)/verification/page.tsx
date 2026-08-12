import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { computeProfileStrength } from "@/lib/profileStrength";
import { PageTitle } from "@/components/ui";
import { ProfileStrengthCard } from "@/components/candidate/ProfileStrengthCard";
import { VerificationPanel } from "@/components/candidate/VerificationPanel";

export default async function VerificationPage() {
  const user = await requireRole("candidate");
  const c = await getCandidate(user.uid);
  if (!c) redirect("/candidate/onboarding");

  return (
    <div className="space-y-4">
      <Link href="/candidate/profile" className="text-sm text-muted">
        ← Profile
      </Link>
      <PageTitle
        title="Verification"
        subtitle="Optional — but verified profiles get matched more often."
      />
      <ProfileStrengthCard strength={computeProfileStrength(c)} />
      <VerificationPanel
        uid={user.uid}
        name={`${c.firstName} ${c.lastName}`.trim()}
        photo={c.photo}
        phoneStatus={c.verification.phone}
        idStatus={c.verification.id}
        employmentStatus={c.verification.employment}
        experiences={c.experiences}
      />
    </div>
  );
}
