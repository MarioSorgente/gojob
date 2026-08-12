import type { StrengthResult } from "@/lib/profileStrength";
import { Card } from "@/components/ui";

export function ProfileStrengthCard({ strength }: { strength: StrengthResult }) {
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">Profile Strength</h2>
        <span className="text-2xl font-extrabold text-brand">
          {strength.percent}%
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${strength.percent}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-muted">
        Improve your chances of being matched.
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-1.5 text-sm">
        {strength.items.map((i) => (
          <li key={i.key} className="flex items-center gap-2">
            <span className={i.done ? "text-success" : "text-slate-300"}>
              {i.done ? "✓" : "○"}
            </span>
            <span className={i.done ? "text-slate-700" : "text-muted"}>
              {i.label}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
