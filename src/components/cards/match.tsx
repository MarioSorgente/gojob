import { cn } from "@/lib/cn";
import { Icon } from "../Icon";

export function matchTone(score: number): "green" | "brand" | "amber" {
  if (score >= 85) return "green";
  if (score >= 70) return "brand";
  return "amber";
}

const toneClasses = {
  green: "bg-success-soft text-success",
  brand: "bg-brand-soft text-brand-dark",
  amber: "bg-warning-soft text-warning",
} as const;

export function MatchPercent({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-sm font-extrabold tabular-nums",
        toneClasses[matchTone(score)],
        className,
      )}
    >
      {score}%
    </span>
  );
}

export function ReasonList({
  reasons,
  limit,
}: {
  reasons: string[];
  limit?: number;
}) {
  const shown = limit ? reasons.slice(0, limit) : reasons;
  if (shown.length === 0) return null;
  return (
    <ul className="space-y-1">
      {shown.map((r, i) => (
        <li key={i} className="flex items-start gap-1.5 text-sm text-subtle">
          <Icon name="check" className="mt-0.5 h-3.5 w-3.5 text-success" />
          {/* Reasons are generated with a leading "✓" — strip it now that the
              tick is a real icon, or every row shows two. */}
          {r.replace(/^✓\s*/, "")}
        </li>
      ))}
    </ul>
  );
}
