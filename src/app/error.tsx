"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ErrorScreen";
import { useT } from "@/lib/i18n/client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    // The digest is the only handle on the server-side stack, which Next
    // deliberately withholds from the browser.
    console.error("Unhandled error", error.digest, error);
  }, [error]);

  return (
    <ErrorScreen title={t("error.title")} hint={t("error.hint")} onRetry={reset} />
  );
}
