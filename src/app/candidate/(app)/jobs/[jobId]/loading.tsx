import { CardListSkeleton } from "@/components/Skeleton";

// This route awaits getJob + scoreJobForCandidate + getJobCandidate, so it is
// one of the slowest in the app and previously had no loading state at all.
export default function Loading() {
  return <CardListSkeleton variant="detail" />;
}
