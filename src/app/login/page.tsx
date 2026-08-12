import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { Logo } from "@/components/brand";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 block">
        <Logo size="lg" />
      </Link>
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Log in to your GoJob account.</p>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted">
        New to GoJob?{" "}
        <Link href="/register" className="font-semibold text-brand">
          Create an account
        </Link>
      </p>
    </div>
  );
}
