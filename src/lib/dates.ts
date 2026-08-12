/** Small date helpers shared across the app. */

/** Fractional years between two ISO dates (end defaults to now when current). */
export function yearsBetween(
  startISO: string,
  endISO: string | null,
  current: boolean,
): number {
  const start = new Date(startISO).getTime();
  if (Number.isNaN(start)) return 0;
  const endRaw = current || !endISO ? Date.now() : new Date(endISO).getTime();
  const end = Number.isNaN(endRaw) ? Date.now() : endRaw;
  if (end <= start) return 0;
  return (end - start) / (365.25 * 24 * 60 * 60 * 1000);
}

/** Total experience across roles, rounded to whole years. */
export function totalExperienceYears(
  experiences: { startDate: string; endDate: string | null; current: boolean }[],
): number {
  const sum = experiences.reduce(
    (acc, e) => acc + yearsBetween(e.startDate, e.endDate, e.current),
    0,
  );
  return Math.round(sum);
}
