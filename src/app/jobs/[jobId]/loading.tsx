import { Skeleton } from "@/components/Skeleton";

/**
 * The public share landing page — the acquisition surface. It previously
 * rendered nothing at all during its server round-trip.
 */
export default function PublicJobLoading() {
  return (
    <div className="mx-auto max-w-md space-y-4 px-5 py-5">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
