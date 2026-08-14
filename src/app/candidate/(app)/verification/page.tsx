import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCandidate } from "@/lib/repos/candidates";
import { computeProfileStrength } from "@/lib/profileStrength";
import { BackLink, PageTitle } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { ProfileStrengthCard } from "@/components/candidate/ProfileStrengthCard";
import { VerificationPanel } from "@/components/candidate/VerificationPanel";

export default async function VerificationPage() {
  const user = await requireRole("candidate");
  const c = await getCandidate(user.uid);
  if (!c) redirect("/candidate/onboarding");

  const t = await getT();

  return (
    <div className="space-y-4">
      <BackLink href="/candidate/profile">{t("nav.profile")}</BackLink>
      <PageTitle
        title={t("candidate.verification")}
        subtitle={t("candidate.noInvitationsHint")}
      />
      <ProfileStrengthCard strength={computeProfileStrength(c)} t={t} />
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
