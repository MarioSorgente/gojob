"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { employerActionOnCandidate } from "@/app/employer/actions";
import { Button, Spinner } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
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
  const t = useT();
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
        {pending ? <Spinner /> : null}
        {t("employer.invite")}
      </Button>
      <MatchCelebration
        open={!!matchHref}
        chatHref={matchHref ?? "#"}
        subtitle={name}
        onClose={() => {
          setMatchHref(null);
          router.refresh();
        }}
      />
    </>
  );
}
