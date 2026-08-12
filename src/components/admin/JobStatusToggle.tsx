"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleJobStatusAction } from "@/app/admin/actions";
import { Button } from "@/components/ui";
import { useToast } from "@/components/Toast";

export function JobStatusToggle({
  jobId,
  status,
}: {
  jobId: string;
  status: "draft" | "live" | "closed";
}) {
  const router = useRouter();
  const { show } = useToast();
  const [pending, start] = useTransition();
  const next = status === "live" ? "closed" : "live";

  return (
    <Button
      size="sm"
      variant={status === "live" ? "danger" : "outline"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await toggleJobStatusAction(jobId, next);
          show(next === "live" ? "Job reopened" : "Job closed");
          router.refresh();
        })
      }
    >
      {pending ? "…" : next === "live" ? "Reopen" : "Close"}
    </Button>
  );
}
