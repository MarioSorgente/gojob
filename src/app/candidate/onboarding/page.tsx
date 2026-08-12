import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { safeNextPath } from "@/lib/nextPath";
import { Logo } from "@/components/brand";
import { OnboardingForm } from "@/components/candidate/OnboardingForm";

export default async function CandidateOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await requireRole("candidate");
  const sp = await searchParams;
  const next = sp.next ? safeNextPath(sp.next, "") : "";

  if (user.onboardingComplete) redirect(next || "/candidate");

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <Logo className="mb-4" />
      <h1 className="text-2xl font-bold">Build your profile</h1>
      <p className="mt-1 mb-5 text-sm text-muted">
        The more complete it is, the better we can match you. You can edit
        anything later.
      </p>
      {next && (
        <p className="mb-4 rounded-xl bg-brand-soft px-4 py-3 text-sm font-medium text-brand-dark">
          Finish your profile and we&apos;ll take you straight back to the job.
        </p>
      )}
      <OnboardingForm
        next={next || undefined}
        submitLabel={next ? "Save & continue to job" : "Save & see jobs"}
      />
    </div>
  );
}
