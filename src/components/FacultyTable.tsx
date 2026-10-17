import { useEffect, useMemo, useState } from 'react';
import type { AssociationNature, FacultyRecord } from '../types';
import { db } from '../db';
import { exportToExcel } from '../export';
import { printRecords } from '../print';
import { normalizeDepartment } from '../departmentUtils';
import { normalizeDesignation } from '../designationUtils';
import { formatDegree, isPhdDegree } from '../degreeUtils';
import { getAcademicYearBounds, wasOnStaffDuringAcademicYear } from '../dateUtils';
import StatusStamp from './StatusStamp';

type SortKey = 'facultyName' | 'alliedDepartment' | 'dateOfJoiningInstitution' | 'presentDesignation';
type ColumnId =
  | 'name'
  | 'department'
  | 'pan'
  | 'degree'
  | 'designation'
  | 'joined'
  | 'association'
  | 'status';

interface ColumnDef {
  id: ColumnId;
  label: string;
  sortKey?: SortKey;
  render: (rec: FacultyRecord) => React.ReactNode;
  text: (rec: FacultyRecord) => string;
  cellClassName?: string;
}

const COLUMN_DEFS: Record<ColumnId, ColumnDef> = {
  name: {
    id: 'name',
    label: 'Name',
    sortKey: 'facultyName',
    cellClassName: 'name',
    render: (rec) => rec.facultyName,
    text: (rec) => rec.facultyName,
  },
  department: {
    id: 'department',
    label: 'Department',
    sortKey: 'alliedDepartment',
    render: (rec) => rec.alliedDepartment,
    text: (rec) => rec.alliedDepartment,
  },
  pan: {
    id: 'pan',
    label: 'PAN',
    cellClassName: 'mono',
    render: (rec) => rec.panNo || '—',
    text: (rec) => rec.panNo || '—',
  },
  degree: {
    id: 'degree',
    label: 'Degree / University',
    cellClassName: 'wrap-cell',
    render: (rec) => `${formatDegree(rec.highestDegree, rec.pursuingPhd)}${rec.university ? `, ${rec.university}` : ''}`,
    text: (rec) => `${formatDegree(rec.highestDegree, rec.pursuingPhd)}${rec.university ? `, ${rec.university}` : ''}`,
  },
  designation: {
    id: 'designation',
    label: 'Present Designation',
    sortKey: 'presentDesignation',
    cellClassName: 'wrap-cell',
    render: (rec) => normalizeDesignation(rec.presentDesignation),
    text: (rec) => normalizeDesignation(rec.presentDesignation),
  },
  joined: {
    id: 'joined',
    label: 'Joined',
    sortKey: 'dateOfJoiningInstitution',
    cellClassName: 'mono',
    render: (rec) => rec.dateOfJoiningInstitution || '—',
    text: (rec) => rec.dateOfJoiningInstitution || '—',
  },
  association: {
    id: 'association',
    label: 'Association',
    render: (rec) => <StatusStamp nature={rec.associationNature} />,
    text: (rec) => (rec.associationNature === 'Regular' ? 'Regular' : 'Contract / Ad hoc'),
  },
  status: {
    id: 'status',
    label: 'Status',
    render: (rec) => (
      <span className={`status-pill ${rec.currentlyAssociated === 'N' ? 'status-pill--left' : 'status-pill--active'}`}>
        {rec.currentlyAssociated === 'Y' ? 'Active' : 'Left'}
      </span>
    ),
    text: (rec) => (rec.currentlyAssociated === 'Y' ? 'Active' : 'Left'),
  },
};

const DEFAULT_ORDER: ColumnId[] = [
  'name',
  'department',
  'pan',
  'degree',
  'designation',
  'joined',
  'association',
  'status',
];

const COLUMN_ORDER_KEY = 'facultyRegister.columnOrder';

function loadColumnOrder(): ColumnId[] {
  try {
    const raw = localStorage.getItem(COLUMN_ORDER_KEY);
    if (!raw) return DEFAULT_ORDER;
    const parsed = JSON.parse(raw) as string[];
    const valid = parsed.filter((id): id is ColumnId => id in COLUMN_DEFS);
    // guard against a stale/corrupt saved order missing columns
    const missing = DEFAULT_ORDER.filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  } catch {
    return DEFAULT_ORDER;
  }
}

export default function FacultyTable({
  records,
  onEdit,
  initialFilters,
}: {
  records: FacultyRecord[];
  onEdit: (rec: FacultyRecord) => void;
  initialFilters?: {
    department?: string;
    designation?: string;
    status?: 'All' | 'Y' | 'N';
    query?: string;
  } | null;
}) {
  const [query, setQuery] = useState(initialFilters?.query ?? '');
  const [natureFilter, setNatureFilter] = useState<AssociationNature | 'All'>('All');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Y' | 'N'>(initialFilters?.status ?? 'All');
  const [departmentFilter, setDepartmentFilter] = useState(initialFilters?.department ?? 'All');
  const [designationFilter, setDesignationFilter] = useState(initialFilters?.designation ?? 'All');
  const [academicYearFilter, setAcademicYearFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('facultyName');
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reportTitle, setReportTitle] = useState('');
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(loadColumnOrder);
  const [dragColId, setDragColId] = useState<ColumnId | null>(null);
  const [dragOverColId, setDragOverColId] = useState<ColumnId | null>(null);

  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.department !== undefined) setDepartmentFilter(initialFilters.department);
      if (initialFilters.designation !== undefined) setDesignationFilter(initialFilters.designation);
      if (initialFilters.status !== undefined) setActiveFilter(initialFilters.status);
      if (initialFilters.query !== undefined) setQuery(initialFilters.query);
    }
  }, [initialFilters]);

  useEffect(() => {
    localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(columnOrder));
  }, [columnOrder]);

  const filtered = useMemo(() => {
    let rows = records;
    if (natureFilter === 'Regular') rows = rows.filter((r) => r.associationNature === 'Regular');
    if (natureFilter === 'Contract / Ad hoc') {
      // Bucket anything not Regular — covers the merged value going
      // forward and any legacy separate 'Contract'/'Ad hoc' records.
      rows = rows.filter((r) => r.associationNature !== 'Regular');
    }
    if (activeFilter !== 'All') rows = rows.filter((r) => r.currentlyAssociated === activeFilter);
    if (departmentFilter !== 'All') {
      rows = rows.filter((r) => normalizeDepartment(r.alliedDepartment) === departmentFilter);
    }
    if (designationFilter !== 'All') {
      rows = rows.filter((r) => normalizeDesignation(r.presentDesignation) === designationFilter);
    }
    if (academicYearFilter !== 'All') {
      const startYear = Number(academicYearFilter);
      rows = rows.filter((r) => wasOnStaffDuringAcademicYear(r, startYear));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const qIsPhd = q === 'phd' || q === 'ph.d' || q === 'ph.d.' || q === 'doctorate';
      const qIsPursuing = q === 'pursuing' || q.includes('pursuing');
      rows = rows.filter(
        (r) =>
          r.facultyName.toLowerCase().includes(q) ||
          r.alliedDepartment.toLowerCase().includes(q) ||
          r.panNo.toLowerCase().includes(q) ||
          (qIsPhd
            ? isPhdDegree(r.highestDegree)
            : qIsPursuing
            ? (Boolean(r.pursuingPhd) || r.highestDegree.toLowerCase().includes('pursuing'))
            : r.highestDegree.toLowerCase().includes(q)) ||
          normalizeDesignation(r.presentDesignation).toLowerCase().includes(q)
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
  }, [
    records,
    query,
    natureFilter,
    activeFilter,
    departmentFilter,
    designationFilter,
    academicYearFilter,
    sortKey,
    sortAsc,
  ]);

  // Academic years to offer in the filter: from the earliest join date on
  // record through one year ahead of the current year, newest first.
  const academicYearOptions = useMemo(() => {
    const currentCalendarYear = new Date().getFullYear();
    let earliest = currentCalendarYear;
    records.forEach((r) => {
      if (r.dateOfJoiningInstitution) {
        const y = Number(r.dateOfJoiningInstitution.slice(0, 4));
        if (!isNaN(y) && y < earliest) earliest = y;
      }
    });
    const latest = currentCalendarYear + 1;
    const years: number[] = [];
    for (let y = latest; y >= earliest; y--) years.push(y);
    return years.map((y) => ({ value: String(y), label: getAcademicYearBounds(y).label }));
  }, [records]);

  const departmentOptions = useMemo(() => {
    const set = new Set(records.map((r) => normalizeDepartment(r.alliedDepartment)).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [records]);

  const designationOptions = useMemo(() => {
    const set = new Set(records.map((r) => normalizeDesignation(r.presentDesignation)).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Reset a filter if its selected value no longer exists in the data
  useEffect(() => {
    if (departmentFilter !== 'All' && !departmentOptions.includes(departmentFilter)) {
      setDepartmentFilter('All');
    }
  }, [departmentOptions, departmentFilter]);

  useEffect(() => {
    if (designationFilter !== 'All' && !designationOptions.includes(designationFilter)) {
      setDesignationFilter('All');
    }
  }, [designationOptions, designationFilter]);

  useEffect(() => {
    if (
      academicYearFilter !== 'All' &&
      !academicYearOptions.some((o) => o.value === academicYearFilter)
    ) {
      setAcademicYearFilter('All');
    }
  }, [academicYearOptions, academicYearFilter]);

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

  const hasActiveFilters =
    Boolean(query.trim()) ||
    natureFilter !== 'All' ||
    activeFilter !== 'All' ||
    departmentFilter !== 'All' ||
    designationFilter !== 'All' ||
    academicYearFilter !== 'All';

  function handleResetFilters() {
    setQuery('');
    setNatureFilter('All');
    setActiveFilter('All');
    setDepartmentFilter('All');
    setDesignationFilter('All');
    setAcademicYearFilter('All');
  }

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

  function handleColDrop(targetId: ColumnId) {
    if (!dragColId || dragColId === targetId) {
      setDragColId(null);
      setDragOverColId(null);
      return;
    }
    setColumnOrder((prev) => {
      const next = prev.filter((id) => id !== dragColId);
      const targetIdx = next.indexOf(targetId);
      next.splice(targetIdx, 0, dragColId);
      return next;
    });
    setDragColId(null);
    setDragOverColId(null);
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

  const orderedColumns = columnOrder.map((id) => COLUMN_DEFS[id]);

  // Builds a sensible title from whatever filters are active, so a
  // department + status filtered view prints/exports with a meaningful
  // label even if the person hasn't typed a custom title — e.g. filtering
  // to Computer Engineering + Active suggests "Computer Engineering —
  // Active Faculty" automatically.
  const autoTitle = (() => {
    const parts: string[] = [];
    parts.push(departmentFilter !== 'All' ? departmentFilter : 'All Departments');
    if (designationFilter !== 'All') parts.push(designationFilter);
    if (natureFilter !== 'All') parts.push(natureFilter);
    if (activeFilter !== 'All') parts.push(activeFilter === 'Y' ? 'Active Faculty' : 'Left Faculty');
    if (academicYearFilter !== 'All') {
      parts.push(`AY ${getAcademicYearBounds(Number(academicYearFilter)).label}`);
    }
    return parts.join(' — ');
  })();

  const effectiveTitle = reportTitle.trim() || autoTitle;

  // A selection only means "just these rows" if it's a genuine subset —
  // selecting literally every visible row (e.g. via the header "select
  // all" checkbox) should behave the same as selecting nothing, not as a
  // deliberate "selected records" print/label.
  const isPartialSelection = selected.size > 0 && selected.size < filtered.length;

  function handlePrint() {
    const rowsToPrint = isPartialSelection
      ? filtered.filter((r) => r.id != null && selected.has(r.id))
      : filtered;
    if (rowsToPrint.length === 0) return;
    const printColumns = orderedColumns.map((col) => ({ label: col.label, value: col.text }));
    const title = isPartialSelection ? `${effectiveTitle} — Selected Records` : effectiveTitle;
    printRecords(rowsToPrint, printColumns, title);
  }

  function handleExport() {
    const safeName = effectiveTitle.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_');
    exportToExcel(filtered, `${safeName || 'Faculty_Register'}.xlsx`);
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
          {query && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setQuery('')}
              title="Clear search"
              aria-label="Clear search input"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-chip-group">
          {(['All', 'Regular', 'Contract / Ad hoc'] as const).map((opt) => (
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

        <select
          className="filter-select"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          aria-label="Filter by department"
        >
          <option value="All">All departments</option>
          {departmentOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={designationFilter}
          onChange={(e) => setDesignationFilter(e.target.value)}
          aria-label="Filter by designation"
        >
          <option value="All">All designations</option>
          {designationOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={academicYearFilter}
          onChange={(e) => setAcademicYearFilter(e.target.value)}
          aria-label="Filter by academic year"
          title="Includes anyone on staff for any part of that academic year (1 June – 31 May), even if they joined or left partway through"
        >
          <option value="All">All academic years</option>
          {academicYearOptions.map((y) => (
            <option key={y.value} value={y.value}>
              AY {y.label}
            </option>
          ))}
        </select>

        <div className="toolbar-right">
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn--ghost btn--filter-reset"
              onClick={handleResetFilters}
              title="Reset all search and filter options"
            >
              Clear filters ({filtered.length} of {records.length})
            </button>
          )}
          {selected.size > 0 && (
            <button className="btn btn--ghost btn--danger" onClick={handleBulkDelete}>
              Delete selected ({selected.size})
            </button>
          )}
          <button className="btn btn--ghost" onClick={() => setColumnOrder(DEFAULT_ORDER)}>
            Reset column order
          </button>
          <button className="btn btn--ghost" onClick={handlePrint}>
            {isPartialSelection ? `Print selected (${selected.size})` : `Print (${filtered.length})`}
          </button>
          <button
            className="btn btn--ghost"
            onClick={handleExport}
          >
            Export to Excel ({filtered.length})
          </button>
        </div>
      </div>

      <div className="report-title-row">
        <label htmlFor="reportTitle">Report title</label>
        <input
          id="reportTitle"
          value={reportTitle}
          onChange={(e) => setReportTitle(e.target.value)}
          placeholder={autoTitle}
        />
        <span className="hint">
          Used as the heading for Print and as the Excel file name. Leave blank to auto-fill from
          your filters above.
        </span>
      </div>

      <p className="hint" style={{ padding: '0 22px 12px' }}>
        Drag a column header to reorder it. Order is remembered on this device.
      </p>

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
              {orderedColumns.map((col) => (
                <th
                  key={col.id}
                  draggable
                  onDragStart={() => setDragColId(col.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverColId !== col.id) setDragOverColId(col.id);
                  }}
                  onDragLeave={() => setDragOverColId((prev) => (prev === col.id ? null : prev))}
                  onDrop={() => handleColDrop(col.id)}
                  onDragEnd={() => {
                    setDragColId(null);
                    setDragOverColId(null);
                  }}
                  onClick={() => col.sortKey && toggleSort(col.sortKey)}
                  className={`draggable-col ${dragColId === col.id ? 'dragging' : ''} ${
                    dragOverColId === col.id ? 'drag-over' : ''
                  }`}
                  title="Drag to reorder"
                >
                  <span className="drag-handle">⠿</span>
                  {col.label}
                  {col.sortKey && <span className="arrow">{sortArrow(col.sortKey)}</span>}
                </th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={orderedColumns.length + 2} className="empty-table-cell">
                  <div className="empty-state" style={{ padding: '40px 16px' }}>
                    <h3>No matching faculty found</h3>
                    <p>No records match your active search query or filter selection.</p>
                    {hasActiveFilters && (
                      <button type="button" className="btn btn--primary" onClick={handleResetFilters}>
                        Reset all filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((rec) => (
              <tr key={rec.id} className={rec.id != null && selected.has(rec.id) ? 'selected' : ''}>
                <td className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={rec.id != null && selected.has(rec.id)}
                    onChange={() => toggleRow(rec.id)}
                    aria-label={`Select ${rec.facultyName}`}
                  />
                </td>
                {orderedColumns.map((col) => (
                  <td key={col.id} className={col.cellClassName}>
                    {col.render(rec)}
                  </td>
                ))}
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
            )))
          }
          </tbody>
        </table>
      </div>
    </div>
  );
}
