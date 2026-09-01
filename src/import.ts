import * as XLSX from 'xlsx';
import { FACULTY_COLUMNS, type AssociationNature, type ContractBasis, type FacultyRecord, type YesNo } from './types';

export interface ParsedRow {
  rowNumber: number; // 1-indexed, matches spreadsheet row (including header row offset)
  record: FacultyRecord;
}

export interface ParseResult {
  rows: ParsedRow[];
  matchedHeaders: string[];
  unmatchedHeaders: string[];
  sheetName: string;
  headerRowNumber: number; // 1-indexed spreadsheet row where headers were found
}

// Aliases so re-uploads of exported files, or lightly-renamed institutional
// sheets, still match without requiring an exact header string.
const HEADER_ALIASES: Record<keyof FacultyRecord, string[]> = {
  alliedDepartment: ['allied department name', 'department', 'allied dept'],
  facultyName: ['name of the faculty', 'faculty name', 'name'],
  panNo: ['pan no.', 'pan no', 'pan'],
  apaarId: ['apaar faculty id (if any)', 'apaar faculty id', 'apaar id'],
  highestDegree: ['highest degree', 'degree'],
  university: ['university'],
  specialization: ['area of specialization', 'specialization'],
  dateOfJoiningInstitution: [
    'date of joining in this institution',
    'date of joining',
    'joining date',
  ],
  experienceYears: [
    'experience in years in current institute',
    'experience (years)',
    'experience',
  ],
  designationAtJoining: [
    'designation at time of joining in this institution',
    'designation at time of joining',
    'designation at joining',
  ],
  presentDesignation: ['present designation'],
  professorDesignationDate: [
    'the date on which designated as professor / associate professor if any',
    'date designated as professor',
    'professor designation date',
  ],
  associationNature: [
    'nature of association (regular / contract / ad hoc)',
    'nature of association',
    'association',
  ],
  contractBasis: [
    'if contractual mention full time or part time / hourly based',
    'contract basis',
    'full time / part time',
  ],
  currentlyAssociated: ['currently associated (y/n)', 'currently associated'],
  dateOfLeaving: [
    'date of leaving if any (in case currently associated is no)',
    'date of leaving',
  ],
  degreeCompletionDate: [
    'date of completion of degree (as per convocation)',
    'date of completion of degree',
    'date of completion (as per convocation)',
    'convocation date',
    'degree completion date',
  ],
  id: [],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildHeaderMap(headers: string[]): { map: Map<number, keyof FacultyRecord>; unmatched: string[] } {
  const map = new Map<number, keyof FacultyRecord>();
  const unmatched: string[] = [];

  headers.forEach((raw, idx) => {
    const norm = normalizeHeader(raw);
    if (!norm) return;
    let matchedKey: keyof FacultyRecord | null = null;
    for (const key of Object.keys(HEADER_ALIASES) as (keyof FacultyRecord)[]) {
      if (key === 'id') continue;
      const aliases = HEADER_ALIASES[key];
      if (aliases.some((a) => normalizeHeader(a) === norm)) {
        matchedKey = key;
        break;
      }
    }
    if (matchedKey) {
      map.set(idx, matchedKey);
    } else {
      unmatched.push(raw);
    }
  });

  return { map, unmatched };
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function toISO(y: number, m: number, d: number): string {
  if (y < 100) y += y < 50 ? 2000 : 1900; // 2-digit year heuristic
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function excelDateToISO(value: unknown): string {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = value.getUTCMonth() + 1;
    const d = value.getUTCDate();
    return toISO(y, m, d);
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return toISO(parsed.y, parsed.m, parsed.d);
  }
  if (typeof value === 'string') {
    let s = value.trim();
    if (!s) return '';
    // strip ordinal suffixes: 4th, 1st, 2nd, 3rd
    s = s.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1');

    // already ISO: yyyy-mm-dd or yyyy/mm/dd
    let m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (m) return toISO(+m[1], +m[2], +m[3]);

    // numeric dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy (2 or 4 digit year)
    m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
    if (m) return toISO(+m[3], +m[2], +m[1]);

    // "4 Aug 2021", "4 August 2021", "04-Aug-2021", "04 Aug, 2021"
    m = s.match(/^(\d{1,2})[\s.-]+([A-Za-z]+)[\s.,-]+(\d{2,4})$/);
    if (m && MONTH_NAMES[m[2].toLowerCase()]) {
      return toISO(+m[3], MONTH_NAMES[m[2].toLowerCase()], +m[1]);
    }

    // "Aug 4 2021", "August 4, 2021", "Aug 4th 2021"
    m = s.match(/^([A-Za-z]+)[\s.,-]+(\d{1,2})[\s.,-]+(\d{2,4})$/);
    if (m && MONTH_NAMES[m[1].toLowerCase()]) {
      return toISO(+m[3], MONTH_NAMES[m[1].toLowerCase()], +m[2]);
    }

    // last resort: let the browser try (assumes local time, not UTC)
    const parsedDate = new Date(s);
    if (!isNaN(parsedDate.getTime())) {
      return toISO(parsedDate.getFullYear(), parsedDate.getMonth() + 1, parsedDate.getDate());
    }
  }
  return '';
}

function normalizeAssociationNature(value: unknown): AssociationNature {
  const s = String(value ?? '').toLowerCase().replace(/[\s-]/g, '');
  if (s.includes('regular')) return 'Regular';
  if (s.includes('contract') || s.includes('adhoc')) return 'Contract / Ad hoc';
  return 'Regular';
}

function normalizeContractBasis(value: unknown): ContractBasis {
  const s = String(value ?? '').toLowerCase();
  if (s.includes('full')) return 'Full time';
  if (s.includes('part') || s.includes('hour')) return 'Part time';
  return '';
}

function normalizeYesNo(value: unknown): YesNo {
  const s = String(value ?? '').trim().toLowerCase();
  if (['n', 'no', 'false', '0'].includes(s)) return 'N';
  return 'Y';
}

function countHeaderMatches(headers: string[]): number {
  const { map } = buildHeaderMap(headers);
  return map.size;
}

/**
 * Some institutional templates have a title/criterion row (e.g. "Criterion 5:
 * Faculty Information") above the actual column headers. Scan the first few
 * rows and pick whichever one matches the most known column names, rather
 * than assuming row 1 is always the header row.
 */
function findHeaderRowIndex(raw: unknown[][]): number {
  const scanLimit = Math.min(raw.length, 10);
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < scanLimit; i++) {
    const row = raw[i].map((h) => String(h ?? ''));
    const score = countHeaderMatches(row);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export async function parseFacultyExcel(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (raw.length === 0) {
    return { rows: [], matchedHeaders: [], unmatchedHeaders: [], sheetName, headerRowNumber: 0 };
  }

  const headerRowIdx = findHeaderRowIndex(raw);
  const headerRow = raw[headerRowIdx].map((h) => String(h ?? ''));
  const { map, unmatched } = buildHeaderMap(headerRow);

  const rows: ParsedRow[] = [];
  for (let r = headerRowIdx + 1; r < raw.length; r++) {
    const dataRow = raw[r];
    const isBlank = dataRow.every((cell) => String(cell ?? '').trim() === '');
    if (isBlank) continue;

    const rec: FacultyRecord = {
      alliedDepartment: '',
      facultyName: '',
      panNo: '',
      apaarId: '',
      highestDegree: '',
      university: '',
      specialization: '',
      degreeCompletionDate: '',
      dateOfJoiningInstitution: '',
      experienceYears: '',
      designationAtJoining: '',
      presentDesignation: '',
      professorDesignationDate: '',
      associationNature: 'Regular',
      contractBasis: '',
      currentlyAssociated: 'Y',
      dateOfLeaving: '',
    };

    map.forEach((key, colIdx) => {
      const cell = dataRow[colIdx];
      switch (key) {
        case 'dateOfJoiningInstitution':
        case 'professorDesignationDate':
        case 'dateOfLeaving':
        case 'degreeCompletionDate':
          rec[key] = excelDateToISO(cell);
          break;
        case 'associationNature':
          rec.associationNature = normalizeAssociationNature(cell);
          break;
        case 'contractBasis':
          rec.contractBasis = normalizeContractBasis(cell);
          break;
        case 'currentlyAssociated':
          rec.currentlyAssociated = normalizeYesNo(cell);
          break;
        case 'experienceYears':
          rec.experienceYears = String(cell ?? '').trim();
          break;
        case 'panNo':
          rec.panNo = String(cell ?? '').trim().toUpperCase();
          break;
        default:
          (rec[key] as string) = String(cell ?? '').trim();
      }
    });

    rows.push({ rowNumber: r + 1, record: rec });
  }

  const matchedHeaders = FACULTY_COLUMNS.filter((c) => [...map.values()].includes(c.key)).map((c) => c.label);

  return { rows, matchedHeaders, unmatchedHeaders: unmatched, sheetName, headerRowNumber: headerRowIdx + 1 };
}
