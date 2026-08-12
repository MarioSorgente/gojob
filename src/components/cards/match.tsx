import { cn } from "@/lib/cn";

export function matchTone(score: number): "green" | "brand" | "amber" {
  if (score >= 85) return "green";
  if (score >= 70) return "brand";
  return "amber";
}

const toneClasses = {
  green: "bg-green-100 text-green-700",
  brand: "bg-brand-soft text-brand-dark",
  amber: "bg-amber-100 text-amber-700",
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
        <li key={i} className="flex items-center gap-1.5 text-sm text-slate-600">
          <span className="text-success">{r.startsWith("✓") ? "" : "✓"}</span>
          {r.replace(/^✓\s*/, "")}
        </li>
      ))}
    </ul>
  );
}
