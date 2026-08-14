"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * The last-resort boundary: it replaces the root layout, so it must render its
 * own <html> and <body> and cannot use the i18n provider (which lives inside
 * that layout). English only, deliberately — this only renders when the layout
 * itself failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error", error.digest, error);
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <div className="flex min-h-dvh items-center justify-center bg-background px-5">
          <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-card">
            <p className="text-xl font-extrabold tracking-tight">
              <span className="text-brand">Go</span>Job
            </p>
            <h1 className="type-title mt-4">Something went wrong</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              That&apos;s on us. Reloading usually fixes it.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex h-12 cursor-pointer items-center justify-center rounded-control bg-brand px-5 font-semibold text-white outline-none hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
