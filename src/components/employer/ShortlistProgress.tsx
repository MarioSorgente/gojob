"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";

const POLL_MS = 2000;
/** Stop after ~1 minute; past that something is wrong and polling won't fix it. */
const MAX_POLLS = 30;

/**
 * Shown while a freshly published job's shortlist is still being scored.
 *
 * Generation runs after the response (see createJobAction), so the server
 * component that rendered this page saw an incomplete shortlist. Refreshing the
 * route re-runs that server component; once the job is no longer `pending` it
 * renders the real deck and this disappears.
 */
export function ShortlistProgress({ failed = false }: { failed?: boolean }) {
  const router = useRouter();
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    if (failed || polls >= MAX_POLLS) return;
    const timer = setTimeout(() => {
      setPolls((n) => n + 1);
      router.refresh();
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [failed, polls, router]);

  if (failed) {
    return (
      <Card className="border-danger/25 bg-danger-soft p-4">
        <p className="font-semibold text-danger">Couldn&apos;t build the shortlist</p>
        <p className="mt-0.5 text-sm text-danger">
          Your job is still live and candidates can apply. Try editing and
          re-saving the job, or contact support if it keeps happening.
        </p>
      </Card>
    );
  }

  const timedOut = polls >= MAX_POLLS;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        {!timedOut && (
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent"
          />
        )}
        <div>
          <p className="font-semibold" aria-live="polite">
            {timedOut ? "Still working…" : "Finding your candidates…"}
          </p>
          <p className="text-sm text-muted">
            {timedOut
              ? "This is taking longer than usual. Refresh the page in a moment."
              : "We're scoring everyone who matches this role. This usually takes a few seconds."}
          </p>
        </div>
      </div>
    </Card>
  );
}
