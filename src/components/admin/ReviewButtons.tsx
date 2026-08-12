"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  reviewBusinessAction,
  reviewCandidateIdAction,
  reviewEmploymentAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui";
import { useToast } from "@/components/Toast";

type Kind = "candidateId" | "employment" | "business";

const ACTIONS = {
  candidateId: reviewCandidateIdAction,
  employment: reviewEmploymentAction,
  business: reviewBusinessAction,
} as const;

export function ReviewButtons({ kind, id }: { kind: Kind; id: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [pending, start] = useTransition();

  function decide(status: "verified" | "rejected") {
    start(async () => {
      await ACTIONS[kind](id, status);
      show(status === "verified" ? "Approved" : "Rejected");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="danger"
        onClick={() => decide("rejected")}
        disabled={pending}
      >
        Reject
      </Button>
      <Button size="sm" onClick={() => decide("verified")} disabled={pending}>
        Approve
      </Button>
    </div>
  );
}
