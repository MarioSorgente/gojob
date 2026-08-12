/**
 * Demo control panel.
 *
 * Deliberately outside /admin: the admin layout requires role === "admin", and
 * on an empty database nobody has that role yet. This page is what breaks the
 * deadlock, so it is gated on the ENABLE_DEMO_TOOLS flag instead of on a role,
 * with the shared token doing the actual authorization on each request.
 */

import { notFound } from "next/navigation";
import { SetupPanel } from "@/components/setup/SetupPanel";

export const metadata = {
  title: "GoJob — demo setup",
  robots: { index: false, follow: false },
};

/**
 * Read the flag per request, not at build time. Without this the page is
 * statically prerendered and the flag's build-time value is baked in — so
 * setting ENABLE_DEMO_TOOLS after a deploy would leave this permanently 404,
 * and unsetting it would leave the page permanently reachable.
 */
export const dynamic = "force-dynamic";

export default function SetupPage() {
  if (process.env.ENABLE_DEMO_TOOLS !== "1") notFound();

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-xl font-bold tracking-tight">Demo setup</h1>
      <p className="mt-1 text-sm text-muted">
        Populates this deployment&apos;s Firebase project with the demo
        marketplace, using the credentials the server already holds.
      </p>
      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Remove the <code className="font-mono font-semibold">ENABLE_DEMO_TOOLS</code>{" "}
        environment variable to switch this page and its endpoint off.
      </div>
      <SetupPanel />
    </main>
  );
}
