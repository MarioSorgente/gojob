import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-border", className)}
    />
  );
}

/**
 * A page-level placeholder.
 *
 * `variant` matters: one job-card skeleton used to flash on Profile,
 * Verification and Chat too, so the loading state resembled nothing on the
 * destination and the layout jumped when the real content arrived.
 */
export function CardListSkeleton({
  rows = 3,
  variant = "card",
}: {
  rows?: number;
  variant?: "card" | "job" | "row" | "detail";
}) {
  return (
    <div className="space-y-3" role="status" aria-busy="true">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-7 w-40" />

      {variant === "detail" ? (
        <div className="space-y-3">
          <div className="space-y-3 rounded-card border border-border bg-surface p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-13 w-13 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-6 w-2/5 rounded-full" />
            <Skeleton className="h-6 w-1/3" />
          </div>
          <div className="space-y-2 rounded-card border border-border bg-surface p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "gap-3",
            variant === "job" ? "grid grid-cols-1 lg:grid-cols-2" : "space-y-3",
          )}
        >
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-card border border-border bg-surface",
                variant === "row" ? "p-3" : "space-y-3 p-4",
              )}
            >
              <div className="flex items-center gap-3">
                <Skeleton
                  className={cn(
                    "rounded-full",
                    variant === "row" ? "h-11 w-11" : "h-11 w-11",
                  )}
                />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
              {variant !== "row" && (
                <>
                  <Skeleton className="h-3 w-2/3" />
                  {variant === "job" && <Skeleton className="h-3 w-1/4" />}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
