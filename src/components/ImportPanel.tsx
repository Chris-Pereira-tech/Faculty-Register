import { useRef, useState } from 'react';
import { db } from '../db';
import { parseFacultyExcel, type ParsedRow } from '../import';
import { validateRecord } from '../validation';

interface PreviewRow extends ParsedRow {
  errors: ReturnType<typeof validateRecord>;
  include: boolean;
}

export default function ImportPanel({ onImported }: { onImported: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [unmatchedHeaders, setUnmatchedHeaders] = useState<string[]>([]);
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
      const rows: PreviewRow[] = result.rows.map((r) => {
        const errors = validateRecord(r.record);
        return { ...r, errors, include: Object.keys(errors).length === 0 };
      });
      setPreview(rows);
      setUnmatchedHeaders(result.unmatchedHeaders);
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

  function toggleAllValid() {
    setPreview((prev) => {
      if (!prev) return prev;
      const anyIncluded = prev.some((r) => Object.keys(r.errors).length === 0 && r.include);
      return prev.map((r) =>
        Object.keys(r.errors).length === 0 ? { ...r, include: !anyIncluded } : r
      );
    });
  }

  async function handleImport() {
    if (!preview) return;
    const toImport = preview.filter((r) => r.include && Object.keys(r.errors).length === 0);
    if (toImport.length === 0) return;
    await db.faculty.bulkAdd(toImport.map((r) => r.record));
    setImportMsg(`Imported ${toImport.length} record${toImport.length === 1 ? '' : 's'} into the register.`);
    setPreview(null);
    setFileName('');
    onImported();
  }

  const validCount = preview?.filter((r) => Object.keys(r.errors).length === 0).length ?? 0;
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

        {unmatchedHeaders.length > 0 && preview && (
          <p className="hint" style={{ marginTop: 10 }}>
            Columns not recognized and ignored: {unmatchedHeaders.join(', ')}
          </p>
        )}
      </div>

      {preview && (
        <>
          <div className="register-toolbar">
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              {preview.length} row{preview.length === 1 ? '' : 's'} found · {validCount} valid ·{' '}
              {includedCount} selected for import
            </span>
            <div className="toolbar-right">
              <button className="btn btn--ghost" onClick={toggleAllValid}>
                Toggle all valid rows
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
                  <th className="checkbox-col"></th>
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
                  const isValid = errorKeys.length === 0;
                  return (
                    <tr key={idx} className={row.include ? 'selected' : ''}>
                      <td className="checkbox-col">
                        <input
                          type="checkbox"
                          checked={row.include}
                          disabled={!isValid}
                          onChange={() => toggleRow(idx)}
                        />
                      </td>
                      <td className="mono">{row.rowNumber}</td>
                      <td className="name">{row.record.facultyName || '—'}</td>
                      <td>{row.record.alliedDepartment || '—'}</td>
                      <td className="mono">{row.record.panNo || '—'}</td>
                      <td>{row.record.presentDesignation || '—'}</td>
                      <td>
                        {isValid ? (
                          <span className="status-dot">Ready</span>
                        ) : (
                          <span className="status-dot inactive" title={Object.values(row.errors).join(', ')}>
                            {errorKeys.length} issue{errorKeys.length === 1 ? '' : 's'}
                          </span>
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
