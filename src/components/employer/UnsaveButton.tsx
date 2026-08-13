"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { employerActionOnCandidate } from "@/app/employer/actions";
import { Button, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";

/**
 * Removes a candidate from the shortlist.
 *
 * Optimistic: the row greys out the moment it's clicked rather than after the
 * server round-trip, because the action itself is cheap and reversible — the
 * candidate simply returns to the job's recommended deck.
 */
export function UnsaveButton({
  jobId,
  candidateId,
  name,
}: {
  jobId: string;
  candidateId: string;
  name: string;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [pending, start] = useTransition();
  const [removed, setRemoved] = useOptimistic(false, () => true);

  function unsave() {
    start(async () => {
      setRemoved(true);
      try {
        await employerActionOnCandidate(jobId, candidateId, "none");
        show(`${name} moved back to Recommended`, "info");
        router.refresh();
      } catch {
        show("Couldn't remove from shortlist", "error");
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={unsave}
      disabled={pending || removed}
      aria-label={`Remove ${name} from shortlist`}
    >
      {pending ? <Spinner /> : "Remove"}
    </Button>
  );
}
