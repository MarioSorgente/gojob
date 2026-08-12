import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { Logo } from "@/components/brand";
import { OnboardingForm } from "@/components/candidate/OnboardingForm";

export default async function CandidateOnboardingPage() {
  const user = await requireRole("candidate");
  if (user.onboardingComplete) redirect("/candidate");

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <Logo className="mb-4" />
      <h1 className="text-2xl font-bold">Build your profile</h1>
      <p className="mt-1 mb-5 text-sm text-muted">
        The more complete it is, the better we can match you. You can edit
        anything later.
      </p>
      <OnboardingForm />
    </div>
  );
}
