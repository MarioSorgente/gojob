"use client";

import { useEffect } from "react";
import { Alert, Button, PageTitle } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

/**
 * Segment boundary: keeps the app shell (nav, sign-out) mounted so a failing
 * page doesn't strand the user with no way out.
 */
export default function CandidateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error("Candidate route error", error.digest, error);
  }, [error]);

  return (
    <>
      <PageTitle title={t("error.title")} subtitle={t("error.hint")} />
      <Alert tone="danger" className="mb-4">
        {t("common.somethingWentWrong")}
        {/* The digest is the only handle on the server-side stack, which Next
            withholds from the browser. Showing it means a screenshot is enough
            to find the failure in the server log. */}
        {error.digest ? (
          <span className="mt-1 block font-mono text-xs opacity-80">
            {error.digest}
          </span>
        ) : null}
      </Alert>
      <Button onClick={reset}>{t("error.reload")}</Button>
    </>
  );
}
