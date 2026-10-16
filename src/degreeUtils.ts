/**
 * Utilities for degree handling, parsing, and formatting.
 */

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

  const cleanedLower = cleaned.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (cleanedLower === 'me') {
    return { baseDegree: 'ME', pursuingPhd: isPursuing };
  }

  if (cleanedLower === 'phd') {
    return { baseDegree: 'PhD', pursuingPhd: false };
  }

  return { baseDegree: cleaned, pursuingPhd: isPursuing };
}

export function formatDegree(baseDegree: string, pursuingPhd?: boolean): string {
  const trimmed = (baseDegree || '').trim();
  if (!trimmed) return '';

  const { baseDegree: normBase, pursuingPhd: alreadyPursuing } = parseDegree(trimmed);
  const shouldPursue = pursuingPhd ?? alreadyPursuing;

  if (normBase === 'ME' && shouldPursue) {
    return 'ME (Pursuing Ph.D.)';
  }

  return normBase || trimmed;
}
