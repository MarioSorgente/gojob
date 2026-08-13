import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function RegisterPage() {
  return (
    <AuthPageShell
      title="Create your account"
      description="Free to join. Set up your profile in a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand hover:text-brand-dark"
          >
            Log in
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
