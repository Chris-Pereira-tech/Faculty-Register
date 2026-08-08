import { useEffect, useMemo, useState } from 'react';
import type { AssociationNature, FacultyRecord } from '../types';
import { db } from '../db';
import { exportToExcel } from '../export';
import StatusStamp from './StatusStamp';

type SortKey = 'facultyName' | 'alliedDepartment' | 'dateOfJoiningInstitution' | 'presentDesignation';

export default function FacultyTable({
  records,
  onEdit,
}: {
  records: FacultyRecord[];
  onEdit: (rec: FacultyRecord) => void;
}) {
  const [query, setQuery] = useState('');
  const [natureFilter, setNatureFilter] = useState<AssociationNature | 'All'>('All');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Y' | 'N'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('facultyName');
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    let rows = records;
    if (natureFilter !== 'All') rows = rows.filter((r) => r.associationNature === natureFilter);
    if (activeFilter !== 'All') rows = rows.filter((r) => r.currentlyAssociated === activeFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.facultyName.toLowerCase().includes(q) ||
          r.alliedDepartment.toLowerCase().includes(q) ||
          r.panNo.toLowerCase().includes(q) ||
          r.presentDesignation.toLowerCase().includes(q)
      );
    }
    const sorted = [...rows].sort((a, b) => {
      const av = (a[sortKey] ?? '').toString().toLowerCase();
      const bv = (b[sortKey] ?? '').toString().toLowerCase();
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [records, query, natureFilter, activeFilter, sortKey, sortAsc]);

  // Drop any selected ids that no longer exist (e.g. deleted from elsewhere)
  useEffect(() => {
    const validIds = new Set(records.map((r) => r.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [records]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => r.id != null && selected.has(r.id));
  const someFilteredSelected = filtered.some((r) => r.id != null && selected.has(r.id));

  function toggleRow(id: number | undefined) {
    if (id == null) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((r) => r.id != null && next.delete(r.id));
      } else {
        filtered.forEach((r) => r.id != null && next.add(r.id));
      }
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const label = ids.length === 1 ? '1 record' : `${ids.length} records`;
    if (!confirm(`Remove ${label} from the register? This can't be undone.`)) return;
    await db.faculty.bulkDelete(ids);
    setSelected(new Set());
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  async function handleDelete(rec: FacultyRecord) {
    if (rec.id == null) return;
    if (!confirm(`Remove ${rec.facultyName} from the register? This can't be undone.`)) return;
    await db.faculty.delete(rec.id);
  }

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortAsc ? '▲' : '▼') : '');

  if (records.length === 0) {
    return (
      <div className="panel">
        <div className="empty-state">
          <h3>The register is empty</h3>
          <p>Add your first faculty record from the "Add record" tab to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="register-toolbar">
        <div className="search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Search name, department, PAN, designation…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="filter-chip-group">
          {(['All', 'Regular', 'Contract', 'Ad hoc'] as const).map((opt) => (
            <button
              key={opt}
              className={`filter-chip ${natureFilter === opt ? 'active' : ''}`}
              onClick={() => setNatureFilter(opt)}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="filter-chip-group">
          {(['All', 'Y', 'N'] as const).map((opt) => (
            <button
              key={opt}
              className={`filter-chip ${activeFilter === opt ? 'active' : ''}`}
              onClick={() => setActiveFilter(opt)}
            >
              {opt === 'All' ? 'All status' : opt === 'Y' ? 'Active' : 'Left'}
            </button>
          ))}
        </div>

        <div className="toolbar-right">
          {selected.size > 0 && (
            <button className="btn btn--ghost btn--danger" onClick={handleBulkDelete}>
              Delete selected ({selected.size})
            </button>
          )}
          <button
            className="btn btn--ghost"
            onClick={() => exportToExcel(filtered, 'Faculty_Register.xlsx')}
          >
            Export to Excel ({filtered.length})
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
                  checked={allFilteredSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected;
                  }}
                  onChange={toggleSelectAllFiltered}
                  aria-label="Select all visible rows"
                />
              </th>
              <th onClick={() => toggleSort('facultyName')}>
                Name <span className="arrow">{sortArrow('facultyName')}</span>
              </th>
              <th onClick={() => toggleSort('alliedDepartment')}>
                Department <span className="arrow">{sortArrow('alliedDepartment')}</span>
              </th>
              <th>PAN</th>
              <th>Degree / University</th>
              <th onClick={() => toggleSort('presentDesignation')}>
                Present Designation <span className="arrow">{sortArrow('presentDesignation')}</span>
              </th>
              <th onClick={() => toggleSort('dateOfJoiningInstitution')}>
                Joined <span className="arrow">{sortArrow('dateOfJoiningInstitution')}</span>
              </th>
              <th>Association</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((rec) => (
              <tr key={rec.id} className={rec.id != null && selected.has(rec.id) ? 'selected' : ''}>
                <td className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={rec.id != null && selected.has(rec.id)}
                    onChange={() => toggleRow(rec.id)}
                    aria-label={`Select ${rec.facultyName}`}
                  />
                </td>
                <td className="name">{rec.facultyName}</td>
                <td>{rec.alliedDepartment}</td>
                <td className="mono">{rec.panNo || '—'}</td>
                <td>
                  {rec.highestDegree}
                  {rec.university ? `, ${rec.university}` : ''}
                </td>
                <td>{rec.presentDesignation}</td>
                <td className="mono">{rec.dateOfJoiningInstitution || '—'}</td>
                <td>
                  <StatusStamp nature={rec.associationNature} />
                </td>
                <td>
                  <span className={`status-dot ${rec.currentlyAssociated === 'N' ? 'inactive' : ''}`}>
                    {rec.currentlyAssociated === 'Y' ? 'Active' : 'Left'}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" onClick={() => onEdit(rec)}>
                      Edit
                    </button>
                    <button className="icon-btn danger" onClick={() => handleDelete(rec)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
