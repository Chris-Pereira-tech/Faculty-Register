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

function excelDateToISO(value: unknown): string {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const y = parsed.y;
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  if (typeof value === 'string') {
    const s = value.trim();
    // already ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // DD/MM/YYYY or DD-MM-YYYY
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) {
      const [, dd, mm, yyyy] = m;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
  }
  return '';
}

function normalizeAssociationNature(value: unknown): AssociationNature {
  const s = String(value ?? '').toLowerCase().replace(/[\s-]/g, '');
  if (s.includes('regular')) return 'Regular';
  if (s.includes('contract')) return 'Contract';
  if (s.includes('adhoc')) return 'Ad hoc';
  return 'Regular';
}

function normalizeContractBasis(value: unknown): ContractBasis {
  const s = String(value ?? '').toLowerCase();
  if (s.includes('full')) return 'Full time';
  if (s.includes('part')) return 'Part time';
  if (s.includes('hour')) return 'Hourly based';
  return '';
}

function normalizeYesNo(value: unknown): YesNo {
  const s = String(value ?? '').trim().toLowerCase();
  if (['n', 'no', 'false', '0'].includes(s)) return 'N';
  return 'Y';
}

export async function parseFacultyExcel(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (raw.length === 0) {
    return { rows: [], matchedHeaders: [], unmatchedHeaders: [], sheetName };
  }

  const headerRow = raw[0].map((h) => String(h ?? ''));
  const { map, unmatched } = buildHeaderMap(headerRow);

  const rows: ParsedRow[] = [];
  for (let r = 1; r < raw.length; r++) {
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

  return { rows, matchedHeaders, unmatchedHeaders: unmatched, sheetName };
}
