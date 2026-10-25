import { useRef, useState } from 'react';
import { db } from '../db';
import { parseFacultyExcel, type ParsedRow } from '../import';
import { validateImportRecord } from '../validation';
import type { FacultyRecord } from '../types';

const FIELD_LABELS: Partial<Record<keyof FacultyRecord, string>> = {
  facultyName: 'Name',
  alliedDepartment: 'Department',
  panNo: 'PAN No.',
  highestDegree: 'Highest Degree',
  dateOfJoiningInstitution: 'Date of Joining',
  presentDesignation: 'Present Designation',
  contractBasis: 'Contract Basis',
  dateOfLeaving: 'Date of Leaving',
};

interface PreviewRow extends ParsedRow {
  errors: ReturnType<typeof validateImportRecord>;
  include: boolean;
}

export default function ImportPanel({ onImported }: { onImported: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [unmatchedHeaders, setUnmatchedHeaders] = useState<string[]>([]);
  const [headerRowNumber, setHeaderRowNumber] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [parseError, setParseError] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setParseError('');
    setImportMsg('');
    setFileName(file.name);
    try {
      const result = await parseFacultyExcel(file);
      if (result.rows.length === 0) {
        setParseError('No data rows found in the first sheet of that file.');
        setPreview(null);
        return;
      }
      if (result.matchedHeaders.length === 0) {
        setParseError(
          "Couldn't recognize any column headers in this file, so nothing was imported. " +
            'Check that the header row (e.g. "Name of the Faculty", "Allied Department Name") ' +
            "is a plain row of text — not a merged/title cell — and try again."
        );
        setPreview(null);
        return;
      }
      const rows: PreviewRow[] = result.rows.map((r) => {
        const errors = validateImportRecord(r.record);
        return { ...r, errors, include: true };
      });
      setPreview(rows);
      setUnmatchedHeaders(result.unmatchedHeaders);
      setHeaderRowNumber(result.headerRowNumber);
      setMatchedCount(result.matchedHeaders.length);
    } catch {
      setParseError("Couldn't read that file. Make sure it's a valid .xlsx or .xls file.");
      setPreview(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function toggleRow(idx: number) {
    setPreview((prev) => prev && prev.map((r, i) => (i === idx ? { ...r, include: !r.include } : r)));
  }

  function toggleSelectAll() {
    setPreview((prev) => {
      if (!prev) return prev;
      const allIncluded = prev.every((r) => r.include);
      return prev.map((r) => ({ ...r, include: !allIncluded }));
    });
  }

  async function handleImport() {
    if (!preview) return;
    const toImport = preview.filter((r) => r.include);
    if (toImport.length === 0) return;
    await db.faculty.bulkAdd(toImport.map((r) => r.record));
    setImportMsg(`Imported ${toImport.length} record${toImport.length === 1 ? '' : 's'} into the register.`);
    setPreview(null);
    setFileName('');
    onImported();
  }

  const includedCount = preview?.filter((r) => r.include).length ?? 0;

  return (
    <div className="panel">
      <div className="form-section">
        <div className="form-section__heading">
          <span className="form-section__number">↑</span>
          <h3 className="form-section__title">Import from Excel</h3>
        </div>

        <div
          className={`dropzone ${isDragging ? 'dropzone--active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
          <p className="dropzone__title">
            {fileName ? fileName : 'Drop an Excel file here, or click to browse'}
          </p>
          <p className="dropzone__hint">
            .xlsx or .xls · header row should match the register's column names (exports from this
            app work automatically)
          </p>
        </div>

        {parseError && <p className="error-text" style={{ marginTop: 10 }}>{parseError}</p>}
        {importMsg && <p className="status-msg" style={{ marginTop: 10 }}>{importMsg}</p>}

        {preview && (
          <div style={{ marginTop: 10 }}>
            <p className="hint">
              Detected header row {headerRowNumber} · matched {matchedCount} of 16 columns
              {matchedCount < 16 && (
                <> · <em>Missing columns will be imported with blank/default values into the register.</em></>
              )}
              {unmatchedHeaders.length > 0 && <> · Unrecognized: {unmatchedHeaders.join(', ')}</>}
            </p>
          </div>
        )}
      </div>

      {preview && (
        <>
          <div className="register-toolbar">
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              {preview.length} row{preview.length === 1 ? '' : 's'} found ·{' '}
              {includedCount} selected for import
            </span>
            <div className="toolbar-right">
              <button className="btn btn--ghost" onClick={toggleSelectAll}>
                {includedCount === preview.length ? 'Deselect all' : 'Select all'}
              </button>
              <button className="btn" disabled={includedCount === 0} onClick={handleImport}>
                Import {includedCount || ''} record{includedCount === 1 ? '' : 's'}
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table className="ledger">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input
                      type="checkbox"
                      checked={preview.length > 0 && preview.every((r) => r.include)}
                      onChange={toggleSelectAll}
                      aria-label="Select all rows"
                    />
                  </th>
                  <th>Row</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>PAN</th>
                  <th>Present Designation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => {
                  const errorKeys = Object.keys(row.errors);
                  const isClean = errorKeys.length === 0;
                  return (
                    <tr key={idx} className={row.include ? 'selected' : ''}>
                      <td className="checkbox-col">
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={() => toggleRow(idx)}
                          aria-label={`Select row ${row.rowNumber}`}
                        />
                      </td>
                      <td className="mono">{row.rowNumber}</td>
                      <td className="name">{row.record.facultyName || '—'}</td>
                      <td>{row.record.alliedDepartment || '—'}</td>
                      <td className="mono">{row.record.panNo || '—'}</td>
                      <td>{row.record.presentDesignation || '—'}</td>
                      <td className="status-cell">
                        {isClean ? (
                          <span className="status-dot">Ready</span>
                        ) : (
                          <div>
                            <span className="status-dot inactive">
                              {errorKeys.length} notice{errorKeys.length === 1 ? '' : 's'}
                            </span>
                            <div className="row-error-list">
                              {Object.entries(row.errors).map(([field, msg]) => (
                                <div key={field}>
                                  <strong>{FIELD_LABELS[field as keyof FacultyRecord] ?? field}:</strong> {msg}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
