import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getBusinessByOwner } from "@/lib/repos/businesses";
import { Logo } from "@/components/brand";
import { BusinessForm } from "@/components/employer/BusinessForm";

export default async function EmployerOnboardingPage() {
  const user = await requireRole("employer");
  // If they already created a business, onboarding is done.
  const existing = await getBusinessByOwner(user.uid);
  if (existing && user.onboardingComplete) redirect("/employer");

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <Logo className="mb-4" />
      <h1 className="text-2xl font-bold">Set up your venue</h1>
      <p className="mt-1 mb-5 text-sm text-muted">
        This is what candidates see. You can edit it anytime.
      </p>
      <BusinessForm />
    </main>
  );
}
