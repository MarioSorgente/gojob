/** Tiny classname joiner (no dependency). Falsy values are dropped. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Format an IDR amount compactly, e.g. 6500000 -> "IDR 6.5M". */
export function formatIDR(amount: number | null | undefined): string {
  if (amount == null) return "";
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `IDR ${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (amount >= 1_000) return `IDR ${Math.round(amount / 1000)}K`;
  return `IDR ${amount}`;
}

/** Human salary range for a card, e.g. "IDR 6–7M / month". */
export function formatSalaryRange(
  type: string,
  min: number | null,
  max: number | null,
): string {
  const per =
    type === "Monthly" ? "month" : type === "Daily" ? "day" : type === "Hourly" ? "hour" : "";
  if (min == null && max == null) return "";
  const unit = per ? ` / ${per}` : "";
  if (min != null && max != null) {
    // Collapse the shared "M"/"K" suffix: "IDR 6–7M".
    const a = formatIDR(min);
    const b = formatIDR(max);
    const bSuffix = b.replace("IDR ", "");
    const aTrimmed = a.replace(/(M|K)$/, "");
    if (b.endsWith("M") && a.endsWith("M")) {
      return `${aTrimmed}–${bSuffix}${unit}`;
    }
    return `${a}–${bSuffix}${unit}`;
  }
  return `${formatIDR(min ?? max)}${unit}`;
}
