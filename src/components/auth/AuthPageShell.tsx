import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand";

export function AuthPageShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(32rem,1fr)]">
      <section className="hidden bg-brand-dark px-12 py-10 text-white lg:flex lg:flex-col">
        <Link
          href="/"
          className="w-fit rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-brand-dark"
        >
          <Logo size="lg" className="[&>span:last-child]:text-white" />
          <span className="sr-only">Back to GoJob home</span>
        </Link>
        <div className="my-auto max-w-lg py-16">
          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-50">
            Built for Bali hospitality
          </span>
          <h2 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight">
            Better matches.
            <br />
            Less inbox chaos.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-8 text-teal-50/80">
            One focused place for hospitality teams and local talent to find
            each other, connect, and get to work.
          </p>
          <div
            className="mt-10 grid max-w-md grid-cols-3 gap-3"
            aria-hidden="true"
          >
            {["Create", "Match", "Connect"].map((label, index) => (
              <div
                key={label}
                className="rounded-2xl border border-white/15 bg-white/10 p-4"
              >
                <span className="text-xs font-bold text-teal-100">
                  0{index + 1}
                </span>
                <p className="mt-5 font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-teal-50/60">
          Free for candidates · Simple for employers
        </p>
      </section>

      <section className="flex min-h-dvh flex-col bg-background px-5 py-6 sm:px-10 lg:justify-center lg:px-16 lg:py-12">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between lg:hidden">
            <Link
              href="/"
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <Logo size="lg" />
              <span className="sr-only">Back to GoJob home</span>
            </Link>
            <Link
              href="/"
              className="text-sm font-semibold text-brand hover:text-brand-dark"
            >
              ← Home
            </Link>
          </div>
          <Link
            href="/"
            className="mb-8 hidden w-fit text-sm font-semibold text-brand hover:text-brand-dark lg:block"
          >
            ← Back to home
          </Link>
          <div className="mt-auto pt-12 lg:mt-0 lg:pt-0">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mb-7 mt-2 text-sm leading-6 text-muted">
              {description}
            </p>
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
              {children}
            </div>
            <div className="mt-6 text-center text-sm text-muted">{footer}</div>
          </div>
          <div className="mt-auto h-12 lg:hidden" />
        </div>
      </section>
    </main>
  );
}
