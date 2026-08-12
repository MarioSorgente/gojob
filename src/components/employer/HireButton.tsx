"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markHiredAction } from "@/app/employer/actions";
import { Button } from "@/components/ui";

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
    return <span className="text-sm font-semibold text-success">✓ Hired</span>;
  }

  return (
    <Button size={size} variant="accent" onClick={hire} disabled={pending}>
      {pending ? "…" : "Mark as Hired"}
    </Button>
  );
}
