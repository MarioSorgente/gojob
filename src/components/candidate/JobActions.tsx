"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyToJobAction, passJobAction } from "@/app/candidate/actions";
import { Alert, Button, Spinner } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";
import { MatchCelebration } from "@/components/MatchCelebration";
import { useToast } from "@/components/Toast";

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
  const t = useT();
  const { show } = useToast();
  const [pending, start] = useTransition();
  const [applied, setApplied] = useState(initialApplied);
  const [matchHref, setMatchHref] = useState<string | null>(null);

  function apply() {
    start(async () => {
      const res = await applyToJobAction(jobId);
      // Refused (rate limited) — don't tell the user they applied when they
      // didn't.
      if (res.error) {
        show(res.error, "error");
        return;
      }
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
      <Alert tone="success" title={t("job.applied")}>
        {businessName}
      </Alert>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" onClick={pass} disabled={pending}>
          {t("employer.pass")}
        </Button>
        <Button size="lg" onClick={apply} disabled={pending}>
          {pending ? <Spinner /> : <Icon name="send" className="h-4 w-4" />}
          {t("job.apply")}
        </Button>
      </div>
      <MatchCelebration
        open={!!matchHref}
        chatHref={matchHref ?? "#"}
        subtitle={businessName}
        // Without this the overlay had no dismiss control at all — the only way
        // out of a successful match was to open the chat.
        onClose={() => {
          setMatchHref(null);
          router.refresh();
        }}
      />
    </>
  );
}
