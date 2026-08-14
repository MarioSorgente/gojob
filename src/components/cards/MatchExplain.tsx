"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { explainMatch, type MatchFactor } from "@/lib/matching";
import { cn } from "@/lib/cn";
import type { MatchBreakdown } from "@/lib/types";
import { MatchPercent, matchTone } from "./match";
import { Icon } from "../Icon";

/**
 * Explains how a match score was reached.
 *
 * Every number here already existed — computeMatch has always returned a
 * seven-factor breakdown and it was persisted on every shortlist row — it was
 * simply never shown. Surfacing it is what turns the score from an unexplained
 * number into something an employer or candidate can act on.
 */

const barTone = {
  green: "bg-success",
  brand: "bg-brand",
  amber: "bg-warning",
} as const;

function FactorRow({ factor }: { factor: MatchFactor }) {
  return (
    <li className="py-2.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-subtle">{factor.label}</span>
        <span className="shrink-0 tabular-nums text-muted">
          <span className="font-semibold text-subtle">
            {factor.points.toFixed(1)}
          </span>
          <span aria-hidden="true"> / {factor.maxPoints}</span>
          <span className="sr-only">
            {" "}
            out of {factor.maxPoints} points
          </span>
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted"
          role="img"
          aria-label={`${factor.label}: ${factor.subScore}%`}
        >
          <div
            className={cn("h-full rounded-full", barTone[matchTone(factor.subScore)])}
            style={{ width: `${factor.subScore}%` }}
          />
        </div>
        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted">
          {factor.subScore}%
        </span>
      </div>
    </li>
  );
}

export function MatchExplain({
  score,
  breakdown,
  reasons,
  /** Candidate-facing copy differs from employer-facing copy. */
  audience = "candidate",
}: {
  score: number;
  breakdown: MatchBreakdown;
  reasons?: string[];
  audience?: "candidate" | "employer";
}) {
  const [open, setOpen] = useState(false);
  const factors = explainMatch(breakdown);

  const subject = audience === "candidate" ? "this job" : "this candidate";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${score}% match — see how this is calculated`}
        className="cursor-pointer rounded-full outline-none transition-transform hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
      >
        <MatchPercent score={score} />
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`${score}% match`}
        description={`How we scored ${subject}`}
      >
        {reasons && reasons.length > 0 && (
          <div className="mb-5 rounded-control bg-surface-muted p-3">
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              Why this is a good match
            </h3>
            <ul className="space-y-1">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-sm text-subtle">
                  <Icon name="check" className="mt-0.5 h-3.5 w-3.5 text-success" />
                  {r.replace(/^✓\s*/, "")}
                </li>
              ))}
            </ul>
          </div>
        )}

        <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
          Score breakdown
        </h3>
        <ul className="divide-y divide-border">
          {factors.map((f) => (
            <FactorRow key={f.key} factor={f} />
          ))}
        </ul>

        <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted">
          Each factor is scored out of 100, then counts for a fixed share of the
          total — role {factors[0].weightPercent}%, experience{" "}
          {factors[1].weightPercent}%, skills {factors[2].weightPercent}%, and so
          on. Matching is a fixed formula, not AI, so the same profile always
          produces the same score.{" "}
          <span className="text-muted">
            Languages are shown as a reason but don&apos;t affect the score.
          </span>
        </p>
      </Sheet>
    </>
  );
}
