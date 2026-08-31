/**
 * Years elapsed from an ISO date string (yyyy-mm-dd) to today, as a
 * one-decimal string (e.g. "5.4"). Returns '' for an empty/invalid date.
 */
export function calcExperienceYears(isoDate: string): string {
  if (!isoDate) return '';
  const start = new Date(`${isoDate}T00:00:00`);
  if (isNaN(start.getTime())) return '';
  const now = new Date();
  const msDiff = now.getTime() - start.getTime();
  if (msDiff < 0) return '0.0';
  const years = msDiff / (1000 * 60 * 60 * 24 * 365.25);
  return years.toFixed(1);
}
