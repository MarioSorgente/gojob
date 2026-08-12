"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { employerActionOnCandidate } from "@/app/employer/actions";
import type { CandidateSummary } from "@/lib/types";
import { CandidateCard } from "@/components/cards/CandidateCard";
import { MatchCelebration } from "@/components/MatchCelebration";
import { Button, EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface DeckCandidate {
  candidateId: string;
  summary: CandidateSummary;
  score: number;
  reasons: string[];
}

export function SwipeDeck({
  jobId,
  candidates,
}: {
  jobId: string;
  candidates: DeckCandidate[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [pending, start] = useTransition();
  const [matchHref, setMatchHref] = useState<string | null>(null);
  const [matchName, setMatchName] = useState("");
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);

  const current = candidates[index];

  function act(action: "passed" | "saved" | "invited") {
    if (!current) return;
    const cand = current;
    setDrag(0);
    start(async () => {
      const res = await employerActionOnCandidate(jobId, cand.candidateId, action);
      if (action === "invited" && res.matched && res.conversationId) {
        setMatchName(`${cand.summary.firstName} ${cand.summary.lastName}`.trim());
        setMatchHref(`/employer/chat/${res.conversationId}`);
      }
      setIndex((i) => i + 1);
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startX.current !== null) setDrag(e.clientX - startX.current);
  }
  function onPointerUp() {
    if (startX.current === null) return;
    const dx = drag;
    startX.current = null;
    if (dx > 120) act("invited");
    else if (dx < -120) act("passed");
    else setDrag(0);
  }

  if (!current) {
    return (
      <>
        <EmptyState
          icon="🎉"
          title="You've reviewed everyone"
          hint="Invited candidates appear in your pipeline below. Check Chats for matches."
        />
        <MatchCelebration
          open={!!matchHref}
          chatHref={matchHref ?? "#"}
          subtitle={matchName ? `You and ${matchName} are connected.` : undefined}
          onClose={() => {
            setMatchHref(null);
            router.refresh();
          }}
        />
      </>
    );
  }

  const rotate = drag / 20;

  return (
    <div>
      <p className="mb-2 text-center text-xs text-muted">
        {candidates.length - index} to review · swipe or tap
      </p>
      <div
        className="touch-none select-none"
        style={{
          transform: `translateX(${drag}px) rotate(${rotate}deg)`,
          transition: startX.current === null ? "transform 0.2s" : "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="relative">
          {drag > 40 && (
            <span className="absolute left-4 top-4 z-10 rotate-[-12deg] rounded-lg border-2 border-success px-2 py-0.5 text-sm font-extrabold text-success">
              INVITE
            </span>
          )}
          {drag < -40 && (
            <span className="absolute right-4 top-4 z-10 rotate-[12deg] rounded-lg border-2 border-red-400 px-2 py-0.5 text-sm font-extrabold text-red-400">
              PASS
            </span>
          )}
          <CandidateCard
            summary={current.summary}
            score={current.score}
            reasons={current.reasons}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button variant="danger" size="lg" onClick={() => act("passed")} disabled={pending}>
          Pass
        </Button>
        <Button variant="subtle" size="lg" onClick={() => act("saved")} disabled={pending}>
          Save
        </Button>
        <Button size="lg" onClick={() => act("invited")} disabled={pending}>
          Invite
        </Button>
      </div>

      <MatchCelebration
        open={!!matchHref}
        chatHref={matchHref ?? "#"}
        subtitle={matchName ? `You and ${matchName} are connected.` : undefined}
        onClose={() => {
          setMatchHref(null);
          router.refresh();
        }}
      />
    </div>
  );
}
