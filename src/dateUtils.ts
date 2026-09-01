import type { FacultyRecord } from './types';

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

/**
 * Indian academic year convention: 1 June of startYear to 31 May of
 * startYear + 1. E.g. getAcademicYearBounds(2025) → AY "2025-26",
 * running 2025-06-01 to 2026-05-31.
 */
export function getAcademicYearBounds(startYear: number): { start: string; end: string; label: string } {
  const start = `${startYear}-06-01`;
  const end = `${startYear + 1}-05-31`;
  const label = `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
  return { start, end, label };
}

/**
 * Whether a faculty member was on staff for any part of the given academic
 * year — joined on/before the year ends, and either still associated or
 * left on/after the year started (so someone who left partway through
 * still counts, but someone who left before the year began does not).
 */
export function wasOnStaffDuringAcademicYear(rec: FacultyRecord, startYear: number): boolean {
  const { start, end } = getAcademicYearBounds(startYear);
  const joined = rec.dateOfJoiningInstitution;
  if (!joined) return false;
  if (joined > end) return false;
  if (rec.currentlyAssociated === 'Y') return true;
  if (!rec.dateOfLeaving) return true; // marked left but no date on record — don't silently drop them
  return rec.dateOfLeaving >= start;
}
