import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { getSessionUser, homePathFor } from "@/lib/auth";
import { safeNextPath } from "@/lib/nextPath";
import { getT } from "@/lib/i18n/server";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Same reverse guard as /login — see the note there.
  const [user, sp, t] = await Promise.all([
    getSessionUser(),
    searchParams,
    getT(),
  ]);
  if (user) redirect(safeNextPath(sp.next, homePathFor(user)));

  return (
    <AuthPageShell
      title={t("auth.registerTitle")}
      description={t("auth.registerDescription")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link
            href="/login"
            className="rounded font-semibold text-brand outline-none hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {t("common.logIn")}
          </Link>
        </>
      }
    >
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </AuthPageShell>
  );
}
