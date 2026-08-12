"use client";

import { Button } from "@/components/ui";

/**
 * Shared footer for paged lists. Renders nothing once the list is exhausted,
 * so callers don't each need the same conditional.
 */
export function LoadMoreButton({
  hasMore,
  loading,
  error,
  onClick,
}: {
  hasMore: boolean;
  loading: boolean;
  error?: string | null;
  onClick: () => void;
}) {
  if (!hasMore && !error) return null;

  return (
    <div className="pt-2 text-center">
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {hasMore && (
        <Button variant="outline" onClick={onClick} disabled={loading}>
          {loading ? "Loading…" : error ? "Try again" : "Load more"}
        </Button>
      )}
    </div>
  );
}
