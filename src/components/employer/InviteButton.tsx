"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { employerActionOnCandidate } from "@/app/employer/actions";
import { Button } from "@/components/ui";
import { MatchCelebration } from "@/components/MatchCelebration";

export function InviteButton({
  jobId,
  candidateId,
  name,
}: {
  jobId: string;
  candidateId: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [matchHref, setMatchHref] = useState<string | null>(null);

  function invite() {
    start(async () => {
      const res = await employerActionOnCandidate(jobId, candidateId, "invited");
      if (res.matched && res.conversationId) {
        setMatchHref(`/employer/chat/${res.conversationId}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button size="sm" onClick={invite} disabled={pending}>
        {pending ? "…" : "Invite"}
      </Button>
      <MatchCelebration
        open={!!matchHref}
        chatHref={matchHref ?? "#"}
        subtitle={`You and ${name} are connected.`}
        onClose={() => {
          setMatchHref(null);
          router.refresh();
        }}
      />
    </>
  );
}
