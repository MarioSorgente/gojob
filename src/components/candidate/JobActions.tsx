"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyToJobAction, passJobAction } from "@/app/candidate/actions";
import { Button } from "@/components/ui";
import { MatchCelebration } from "@/components/MatchCelebration";

export function JobActions({
  jobId,
  initialApplied,
  businessName,
}: {
  jobId: string;
  initialApplied: boolean;
  businessName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [applied, setApplied] = useState(initialApplied);
  const [matchHref, setMatchHref] = useState<string | null>(null);

  function apply() {
    start(async () => {
      const res = await applyToJobAction(jobId);
      setApplied(true);
      if (res.matched && res.conversationId) {
        setMatchHref(`/candidate/chat/${res.conversationId}`);
      } else {
        router.refresh();
      }
    });
  }

  function pass() {
    start(async () => {
      await passJobAction(jobId);
      router.push("/candidate");
    });
  }

  if (applied && !matchHref) {
    return (
      <div className="rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-700">
        ✓ Applied — we&apos;ll let you know if {businessName} is interested.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" onClick={pass} disabled={pending}>
          Pass
        </Button>
        <Button size="lg" onClick={apply} disabled={pending}>
          {pending ? "…" : "Apply"}
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
