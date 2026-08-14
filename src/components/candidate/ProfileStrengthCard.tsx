import type { StrengthResult } from "@/lib/profileStrength";
import type { Translate } from "@/lib/i18n/dictionary";
import { Card, Progress } from "@/components/ui";
import { Icon } from "@/components/Icon";

export function ProfileStrengthCard({
  strength,
  t,
}: {
  strength: StrengthResult;
  t: Translate;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="type-heading">{t("candidate.profileStrength")}</h2>
        <span className="text-2xl font-extrabold tabular-nums text-brand">
          {strength.percent}%
        </span>
      </div>

      <Progress
        value={strength.percent}
        label={t("candidate.profileStrength")}
        className="mt-3"
      />

      <ul className="mt-4 grid grid-cols-1 gap-2 text-sm">
        {strength.items.map((i) => (
          <li key={i.key} className="flex items-center gap-2">
            <Icon
              name={i.done ? "check" : "plus"}
              className={`h-4 w-4 ${i.done ? "text-success" : "text-muted"}`}
            />
            <span className={i.done ? "text-subtle" : "text-muted"}>{i.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
