import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Welcome back"
      description="Log in to your GoJob account."
      footer={
        <>
          New to GoJob?{" "}
          <Link
            href="/register"
            className="font-semibold text-brand hover:text-brand-dark"
          >
            Create an account
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
