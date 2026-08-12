"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondInvitationAction } from "@/app/candidate/actions";
import { Button } from "@/components/ui";
import { MatchCelebration } from "@/components/MatchCelebration";

export function InvitationActions({
  jobId,
  businessName,
}: {
  jobId: string;
  businessName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [matchHref, setMatchHref] = useState<string | null>(null);

  function accept() {
    start(async () => {
      const res = await respondInvitationAction(jobId, true);
      if (res.matched && res.conversationId) {
        setMatchHref(`/candidate/chat/${res.conversationId}`);
      } else {
        router.refresh();
      }
    });
  }

  function decline() {
    start(async () => {
      await respondInvitationAction(jobId, false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={decline} disabled={pending}>
          Decline
        </Button>
        <Button onClick={accept} disabled={pending}>
          {pending ? "…" : "Accept"}
        </Button>
      </div>
      <MatchCelebration
        open={!!matchHref}
        chatHref={matchHref ?? "#"}
        subtitle={`You and ${businessName} are connected.`}
      />
    </>
  );
}
