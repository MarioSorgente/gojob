"use client";

import { Alert, Button, Spinner } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

/**
 * Shared footer for paged lists. Renders nothing once the list is exhausted,
 * so callers don't each need the same conditional.
 */
export function LoadMoreButton({
  hasMore,
  loading,
  failed,
  onClick,
}: {
  hasMore: boolean;
  loading: boolean;
  failed?: boolean;
  onClick: () => void;
}) {
  const t = useT();
  if (!hasMore && !failed) return null;

  return (
    <div className="pt-2 text-center">
      {failed && (
        <Alert tone="danger" className="mb-3 text-left">
          {t("common.somethingWentWrong")}
        </Alert>
      )}
      {hasMore && (
        <Button variant="outline" onClick={onClick} disabled={loading}>
          {loading ? <Spinner /> : null}
          {loading
            ? t("common.loading")
            : failed
              ? t("common.retry")
              : t("common.loadMore")}
        </Button>
      )}
    </div>
  );
}
