import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { Logo } from "@/components/brand";

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 block">
        <Logo size="lg" />
      </Link>
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Free to join. Set up your profile in a minute.
      </p>
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand">
          Log in
        </Link>
      </p>
    </div>
  );
}
