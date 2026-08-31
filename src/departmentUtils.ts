import { DEPARTMENT_OPTIONS } from './types';

/**
 * Maps a raw department string as entered/imported (e.g. "CE-1", "CE 2",
 * "CSE", "Mech") to one of the four canonical department names. Falls back
 * to the trimmed original value if nothing recognizable matches, so an
 * unexpected department doesn't silently disappear — it just won't be
 * grouped under one of the four.
 */
export function normalizeDepartment(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  if (DEPARTMENT_OPTIONS.includes(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();
  // Strip a trailing batch/section number like "-1", " 2", "1" so
  // "CE-1", "CE 2", "CE1" all collapse to the same core token.
  const core = lower.replace(/[\s._-]*\d+\s*$/, '').trim();
  const compact = core.replace(/[\s._-]/g, '');

  // Longer, unambiguous phrases first — "Electronics and Computer Science"
  // contains "computer science" as a substring, so it must be checked
  // before the plain Computer Science Engineering match below.
  if (
    compact.includes('electronicsandcomputerscience') ||
    compact.includes('electronicscomputerscience')
  ) {
    return 'Electronics and Computer Science';
  }
  if (compact.includes('computerscienceengineering') || compact.includes('computerscience')) {
    return 'Computer Science Engineering';
  }
  if (compact.includes('computerengineering')) {
    return 'Computer Engineering';
  }
  if (compact.includes('mechanical')) {
    return 'Mechanical';
  }

  // Short abbreviations — exact match only (after stripping batch numbers),
  // since substring matching on 2-3 letter codes is too prone to false hits.
  if (compact === 'ecs') return 'Electronics and Computer Science';
  if (compact === 'cse') return 'Computer Science Engineering';
  if (compact === 'ce') return 'Computer Engineering';
  if (compact === 'me' || compact === 'mech') return 'Mechanical';

  return trimmed;
}
