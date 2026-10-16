import { DESIGNATION_OPTIONS } from './types';

/**
 * Normalizes designation strings entered manually or imported from spreadsheets.
 * Strips carriage returns, collapses multiple spaces/unicode spaces, and unifies
 * variants (including typos like "Assocaiate Professor", "Associate Professor ",
 * "Assoc Professor", etc.) into canonical names like "Associate Professor".
 */
export function normalizeDesignation(raw: string): string {
  if (!raw) return '';

  // Replace unicode whitespace, strip carriage returns, collapse multiple spaces
  const cleaned = raw
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
    .replace(/\r/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!cleaned) return '';

  const lower = cleaned.toLowerCase();
  const compact = lower.replace(/[^a-z0-9]/g, '');

  // Unify all variants and typos of Associate Professor
  // e.g. "assocaiate professor", "associate professor", "assoc. professor", "assoc prof"
  if (
    compact.startsWith('assoc') &&
    (compact.includes('prof') || compact.includes('professor'))
  ) {
    return 'Associate Professor';
  }

  // Unify variants of Assistant Professor
  // e.g. "assistant professor", "asst professor", "asst. professor", "asst prof"
  if (
    (compact.startsWith('assist') || compact.startsWith('asst')) &&
    (compact.includes('prof') || compact.includes('professor'))
  ) {
    return 'Assistant Professor';
  }

  // Pure Professor
  if (compact === 'professor' || compact === 'prof') {
    return 'Professor';
  }

  // Exact match against canonical options case-insensitively
  for (const opt of DESIGNATION_OPTIONS) {
    if (opt.toLowerCase() === lower) {
      return opt;
    }
  }

  return cleaned;
}
