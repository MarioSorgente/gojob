"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondInvitationAction } from "@/app/candidate/actions";
import { Button, Spinner } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { MatchCelebration } from "@/components/MatchCelebration";

export function InvitationActions({
  jobId,
  businessName,
}: {
  jobId: string;
  businessName: string;
}) {
  const router = useRouter();
  const t = useT();
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
          {t("candidate.decline")}
        </Button>
        <Button onClick={accept} disabled={pending}>
          {pending ? <Spinner /> : null}
          {t("candidate.accept")}
        </Button>
      </div>
      {/* onClose is required, not optional: without it the overlay had no
          dismiss control at all and the only way out of a successful match was
          to open the chat. */}
      <MatchCelebration
        open={!!matchHref}
        chatHref={matchHref ?? "#"}
        subtitle={businessName}
        onClose={() => {
          setMatchHref(null);
          router.refresh();
        }}
      />
    </>
  );
}
