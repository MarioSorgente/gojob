import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { getSessionUser, homePathFor } from "@/lib/auth";
import { safeNextPath } from "@/lib/nextPath";
import { getT } from "@/lib/i18n/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // The reverse guard. Middleware bounces signed-out users off protected
  // routes, but nothing stopped a signed-in user landing back on /login — which
  // looks exactly like having been logged out.
  const [user, sp, t] = await Promise.all([
    getSessionUser(),
    searchParams,
    getT(),
  ]);
  if (user) redirect(safeNextPath(sp.next, homePathFor(user)));

  return (
    <AuthPageShell
      title={t("auth.loginTitle")}
      description={t("auth.loginDescription")}
      footer={
        <>
          {t("auth.newToGoJob")}{" "}
          <Link
            href="/register"
            className="rounded font-semibold text-brand outline-none hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {t("auth.createAccount")}
          </Link>
        </>
      }
    >
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthPageShell>
  );
}
