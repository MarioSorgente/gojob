"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markHiredAction } from "@/app/employer/actions";
import { Button, Spinner } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useT } from "@/lib/i18n/client";

export function HireButton({
  jobId,
  candidateId,
  size = "sm",
}: {
  jobId: string;
  candidateId: string;
  size?: "sm" | "md" | "lg";
}) {
  const router = useRouter();
  const t = useT();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  function hire() {
    start(async () => {
      await markHiredAction(jobId, candidateId);
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
        <Icon name="check" className="h-4 w-4" />
        {t("employer.hire")}
      </span>
    );
  }

  return (
    <Button size={size} variant="accent" onClick={hire} disabled={pending}>
      {pending ? <Spinner /> : <Icon name="checkBadge" className="h-4 w-4" />}
      {t("employer.hire")}
    </Button>
  );
}
