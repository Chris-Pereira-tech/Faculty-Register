/**
 * Utilities for degree handling, parsing, and formatting.
 */

/**
 * Checks whether a degree string represents a Ph.D. in any form
 * (e.g., "PhD", "Ph.D.", "Doctorate", "Doctor of Philosophy", "Ph.D. in Engineering", "Ph.D (Tech)", "D.Phil").
 * Returns false if the faculty is only pursuing Ph.D. without already holding one.
 */
export function isPhdDegree(raw: string): boolean {
  if (!raw) return false;
  const trimmed = raw
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
    .replace(/\r/g, '')
    .trim();

  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();

  // Strip any "pursuing" clause to inspect the base qualification
  const cleaned = lower.replace(/\s*\(?\s*pursuing\s*ph\.?d\.?\s*\)?/gi, '').trim();

  // If the entire string was just "Pursuing Ph.D.", they don't hold a Ph.D. yet
  if (!cleaned) return false;

  // If the base starts with non-doctoral degrees (like "me", "m.e.", "b.e.", "mtech", "btech"),
  // and they were pursuing PhD, they do not hold a PhD yet.
  if (lower.includes('pursuing')) {
    const compactCleaned = cleaned.replace(/[^a-z0-9]/g, '');
    if (
      compactCleaned === 'me' ||
      compactCleaned === 'be' ||
      compactCleaned === 'mtech' ||
      compactCleaned === 'btech' ||
      compactCleaned === 'msc' ||
      compactCleaned === 'bsc' ||
      compactCleaned === 'mba' ||
      compactCleaned === 'mca'
    ) {
      return false;
    }
  }

  // Any variation of Ph.D., PhD, Ph. D, P.h.D
  if (/\bph\.?\s*d\.?\b/i.test(cleaned)) {
    return true;
  }

  // Any variation of Doctorate or Doctor of Philosophy
  if (/\bdoctor(ate|al| of philosophy)?\b/i.test(cleaned)) {
    return true;
  }

  // Any variation of D.Phil
  if (/\bd\.?\s*phil\.?\b/i.test(cleaned)) {
    return true;
  }

  // Fallback check on compact alphanumeric string
  const compact = cleaned.replace(/[^a-z]/g, '');
  if (
    compact.startsWith('phd') ||
    compact.includes('phd') ||
    compact.startsWith('doctor') ||
    compact.includes('doctorate')
  ) {
    return true;
  }

  return false;
}

export function parseDegree(raw: string): { baseDegree: string; pursuingPhd: boolean } {
  const trimmed = (raw || '')
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
    .replace(/\r/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!trimmed) return { baseDegree: '', pursuingPhd: false };

  const lower = trimmed.toLowerCase();
  const isPursuing = lower.includes('pursuing') && (lower.includes('phd') || lower.includes('ph.d'));

  // Strip "(Pursuing Ph.D.)" or "Pursuing PhD" or similar clause to isolate the base degree
  const cleaned = trimmed
    .replace(/\s*\(?\s*pursuing\s*ph\.?d\.?\s*\)?/gi, '')
    .trim();

  // If the degree represents a PhD in any form, it is recognized as PhD
  if (isPhdDegree(trimmed)) {
    return { baseDegree: 'PhD', pursuingPhd: false };
  }

  const cleanedLower = cleaned.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (cleanedLower === 'me') {
    return { baseDegree: 'ME', pursuingPhd: isPursuing };
  }

  return { baseDegree: cleaned, pursuingPhd: isPursuing };
}

export function formatDegree(baseDegree: string, pursuingPhd?: boolean): string {
  const trimmed = (baseDegree || '').trim();
  if (!trimmed) return '';

  if (isPhdDegree(trimmed)) {
    return 'PhD';
  }

  const { baseDegree: normBase, pursuingPhd: alreadyPursuing } = parseDegree(trimmed);
  const shouldPursue = pursuingPhd ?? alreadyPursuing;

  if (normBase === 'ME' && shouldPursue) {
    return 'ME (Pursuing Ph.D.)';
  }

  if (normBase === 'PhD') {
    return 'PhD';
  }

  return normBase || trimmed;
}
