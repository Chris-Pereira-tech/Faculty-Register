import * as XLSX from 'xlsx';
import { FACULTY_COLUMNS, type FacultyRecord } from './types';
import { formatDegree } from './degreeUtils';
import { normalizeDesignation } from './designationUtils';

export function exportToExcel(records: FacultyRecord[], filename = 'Faculty_Register.xlsx') {
  const headers = FACULTY_COLUMNS.map((c) => c.label);
  const rows = records.map((rec) =>
    FACULTY_COLUMNS.map((c) => {
      if (c.key === 'highestDegree') {
        return formatDegree(rec.highestDegree, rec.pursuingPhd);
      }
      if (c.key === 'presentDesignation' || c.key === 'designationAtJoining') {
        return normalizeDesignation(String(rec[c.key] ?? ''));
      }
      return rec[c.key] ?? '';
    })
  );

  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Reasonable column widths so it's usable as soon as it opens
  worksheet['!cols'] = FACULTY_COLUMNS.map((c) => ({
    wch: Math.min(Math.max(c.label.length * 0.9, 14), 32),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Faculty Register');
  XLSX.writeFile(workbook, filename);
}
