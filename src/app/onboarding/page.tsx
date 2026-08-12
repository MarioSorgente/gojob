import { getSessionUser, homePathFor } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand";
import { RoleSelect } from "@/components/onboarding/RoleSelect";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role) redirect(homePathFor(user));

  const sp = await searchParams;
  const preselect = typeof sp.role === "string" ? sp.role : undefined;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Logo size="lg" className="mb-8" />
      <h1 className="text-2xl font-bold">How will you use GoJob?</h1>
      <p className="mt-1 mb-6 text-sm text-muted">You can only pick one for now.</p>
      <RoleSelect preselect={preselect} />
    </div>
  );
}
