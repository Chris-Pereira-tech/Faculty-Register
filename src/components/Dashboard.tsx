import { useMemo, useState } from 'react';
import type { FacultyRecord } from '../types';
import { normalizeDepartment } from '../departmentUtils';
import { normalizeDesignation } from '../designationUtils';
import { parseDegree } from '../degreeUtils';
import { calcExperienceYears } from '../dateUtils';

interface DashboardProps {
  records: FacultyRecord[];
  onNavigateToRegister: (filters?: {
    department?: string;
    designation?: string;
    status?: 'All' | 'Y' | 'N';
  }) => void;
}

export default function Dashboard({ records, onNavigateToRegister }: DashboardProps) {
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [activeOnly, setActiveOnly] = useState<boolean>(true);

  // Departments available in data
  const departmentOptions = useMemo(() => {
    const set = new Set(records.map((r) => normalizeDepartment(r.alliedDepartment)).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Filter records by department scope
  const scopedRecords = useMemo(() => {
    if (selectedDept === 'All') return records;
    return records.filter((r) => normalizeDepartment(r.alliedDepartment) === selectedDept);
  }, [records, selectedDept]);

  // Primary evaluation subset (Active only by default, or all staff)
  const evalRecords = useMemo(() => {
    if (!activeOnly) return scopedRecords;
    return scopedRecords.filter((r) => r.currentlyAssociated === 'Y');
  }, [scopedRecords, activeOnly]);

  // Core metrics calculation
  const totalInScope = scopedRecords.length;
  const activeCount = scopedRecords.filter((r) => r.currentlyAssociated === 'Y').length;
  const leftCount = scopedRecords.filter((r) => r.currentlyAssociated === 'N').length;
  const activeRate = totalInScope > 0 ? Math.round((activeCount / totalInScope) * 100) : 0;

  // Qualifications
  const qualificationStats = useMemo(() => {
    let phd = 0;
    let pursuing = 0;
    let me = 0;
    let other = 0;

    evalRecords.forEach((r) => {
      const { baseDegree, pursuingPhd } = parseDegree(r.highestDegree);
      const isPursuing = r.pursuingPhd ?? pursuingPhd;
      if (baseDegree === 'PhD') {
        phd++;
      } else if (isPursuing) {
        pursuing++;
      } else if (baseDegree === 'ME') {
        me++;
      } else {
        other++;
      }
    });

    const total = evalRecords.length;
    const phdPct = total > 0 ? Math.round((phd / total) * 100) : 0;
    const pursuingPct = total > 0 ? Math.round((pursuing / total) * 100) : 0;
    const mePct = total > 0 ? Math.round((me / total) * 100) : 0;
    const otherPct = total > 0 ? Math.round((other / total) * 100) : 0;

    return { phd, pursuing, me, other, phdPct, pursuingPct, mePct, otherPct, total };
  }, [evalRecords]);

  // Cadre / Designation distribution
  const cadreStats = useMemo(() => {
    let prof = 0;
    let assoc = 0;
    let asst = 0;
    let other = 0;

    evalRecords.forEach((r) => {
      const norm = normalizeDesignation(r.presentDesignation);
      if (norm === 'Associate Professor') {
        assoc++;
      } else if (norm === 'Assistant Professor') {
        asst++;
      } else if (norm.includes('Professor')) {
        prof++;
      } else {
        other++;
      }
    });

    const total = evalRecords.length;
    const profPct = total > 0 ? Math.round((prof / total) * 100) : 0;
    const assocPct = total > 0 ? Math.round((assoc / total) * 100) : 0;
    const asstPct = total > 0 ? Math.round((asst / total) * 100) : 0;
    const otherPct = total > 0 ? Math.round((other / total) * 100) : 0;

    return { prof, assoc, asst, other, profPct, assocPct, asstPct, otherPct, total };
  }, [evalRecords]);

  // Association nature (Regular vs Contract)
  const associationStats = useMemo(() => {
    const regular = evalRecords.filter((r) => r.associationNature === 'Regular').length;
    const contract = evalRecords.filter((r) => r.associationNature !== 'Regular').length;
    const total = evalRecords.length;
    const regularPct = total > 0 ? Math.round((regular / total) * 100) : 0;
    const contractPct = total > 0 ? Math.round((contract / total) * 100) : 0;
    return { regular, contract, regularPct, contractPct, total };
  }, [evalRecords]);

  // Average experience & Tenure bands
  const experienceStats = useMemo(() => {
    let sum = 0;
    let count = 0;
    let under2 = 0;
    let twoTo5 = 0;
    let fiveTo10 = 0;
    let over10 = 0;

    evalRecords.forEach((r) => {
      const expStr = r.experienceYears || calcExperienceYears(r.dateOfJoiningInstitution);
      const exp = parseFloat(expStr);
      if (!isNaN(exp)) {
        sum += exp;
        count++;
        if (exp < 2) under2++;
        else if (exp < 5) twoTo5++;
        else if (exp < 10) fiveTo10++;
        else over10++;
      }
    });

    const avg = count > 0 ? (sum / count).toFixed(1) : '0';
    return { avg, count, under2, twoTo5, fiveTo10, over10 };
  }, [evalRecords]);

  // Department-wise comparison table
  const departmentBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        total: number;
        active: number;
        phd: number;
        pursuing: number;
        prof: number;
        assoc: number;
        asst: number;
        regular: number;
        contract: number;
        expSum: number;
        expCount: number;
      }
    >();

    records.forEach((r) => {
      const dept = normalizeDepartment(r.alliedDepartment) || 'Unspecified';
      let entry = map.get(dept);
      if (!entry) {
        entry = {
          total: 0,
          active: 0,
          phd: 0,
          pursuing: 0,
          prof: 0,
          assoc: 0,
          asst: 0,
          regular: 0,
          contract: 0,
          expSum: 0,
          expCount: 0,
        };
        map.set(dept, entry);
      }

      entry.total++;
      const isActive = r.currentlyAssociated === 'Y';
      if (isActive) entry.active++;

      // When activeOnly is toggled, compute sub-metrics according to current evaluation mode
      if (!activeOnly || isActive) {
        const { baseDegree, pursuingPhd } = parseDegree(r.highestDegree);
        const isPursuing = r.pursuingPhd ?? pursuingPhd;
        if (baseDegree === 'PhD') entry.phd++;
        else if (isPursuing) entry.pursuing++;

        const norm = normalizeDesignation(r.presentDesignation);
        if (norm === 'Associate Professor') entry.assoc++;
        else if (norm === 'Assistant Professor') entry.asst++;
        else if (norm.includes('Professor')) entry.prof++;

        if (r.associationNature === 'Regular') entry.regular++;
        else entry.contract++;

        const expStr = r.experienceYears || calcExperienceYears(r.dateOfJoiningInstitution);
        const exp = parseFloat(expStr);
        if (!isNaN(exp)) {
          entry.expSum += exp;
          entry.expCount++;
        }
      }
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        ...data,
        avgExp: data.expCount > 0 ? (data.expSum / data.expCount).toFixed(1) : '—',
        evalCount: activeOnly ? data.active : data.total,
        phdPct: (activeOnly ? data.active : data.total) > 0
          ? Math.round((data.phd / (activeOnly ? data.active : data.total)) * 100)
          : 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [records, activeOnly]);

  if (records.length === 0) {
    return (
      <div className="panel">
        <div className="empty-state">
          <h3>No records in register</h3>
          <p>Add faculty records or import an Excel spreadsheet to view the analytics dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Scope and filter banner */}
      <div className="panel dashboard-header-panel">
        <div className="dashboard-header-row">
          <div>
            <h2 className="dashboard-title">Institutional Faculty Overview</h2>
            <p className="dashboard-subtitle">
              Live staffing metrics, doctoral ratios, cadre balance, and department analytics.
            </p>
          </div>
          <div className="dashboard-controls">
            <div className="control-field">
              <label htmlFor="deptScope">Department</label>
              <select
                id="deptScope"
                className="filter-select"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="All">All Departments ({records.length})</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="control-field">
              <label>Staff Scope</label>
              <div className="dashboard-toggle-group">
                <button
                  type="button"
                  className={`toggle-btn ${activeOnly ? 'active' : ''}`}
                  onClick={() => setActiveOnly(true)}
                  title="Include only currently associated faculty"
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${!activeOnly ? 'active' : ''}`}
                  onClick={() => setActiveOnly(false)}
                  title="Include all faculty records, including left"
                >
                  All ({totalInScope})
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn--ghost"
              onClick={() =>
                onNavigateToRegister({
                  department: selectedDept !== 'All' ? selectedDept : undefined,
                  status: activeOnly ? 'Y' : 'All',
                })
              }
              title="Open the faculty ledger with these filters"
            >
              Open in Register →
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="dashboard-kpi-grid">
        {/* Card 1: Active Faculty Strength */}
        <div
          className="kpi-card"
          onClick={() =>
            onNavigateToRegister({
              department: selectedDept !== 'All' ? selectedDept : undefined,
              status: 'Y',
            })
          }
          role="button"
          tabIndex={0}
          title="Click to view active faculty"
        >
          <div className="kpi-card__header">
            <span className="kpi-label">Active Faculty</span>
            <span className="kpi-badge kpi-badge--green">{activeRate}% on staff</span>
          </div>
          <div className="kpi-value">{activeCount}</div>
          <div className="kpi-foot">
            <span>Total on file: <strong>{totalInScope}</strong></span>
            {leftCount > 0 && <span className="kpi-foot-sub">({leftCount} left)</span>}
          </div>
        </div>

        {/* Card 2: Doctorates (Ph.D.) */}
        <div
          className="kpi-card"
          onClick={() =>
            onNavigateToRegister({
              department: selectedDept !== 'All' ? selectedDept : undefined,
              status: activeOnly ? 'Y' : 'All',
            })
          }
          role="button"
          tabIndex={0}
          title="Doctoral qualified faculty"
        >
          <div className="kpi-card__header">
            <span className="kpi-label">Ph.D. Holders</span>
            <span className="kpi-badge kpi-badge--brass">{qualificationStats.phdPct}%</span>
          </div>
          <div className="kpi-value">{qualificationStats.phd}</div>
          <div className="kpi-foot">
            <span>Doctoral cadre strength</span>
            <span className="kpi-foot-sub">{evalRecords.length - qualificationStats.phd} non-Ph.D.</span>
          </div>
        </div>

        {/* Card 3: Pursuing Ph.D. */}
        <div
          className="kpi-card"
          onClick={() =>
            onNavigateToRegister({
              department: selectedDept !== 'All' ? selectedDept : undefined,
              status: activeOnly ? 'Y' : 'All',
            })
          }
          role="button"
          tabIndex={0}
          title="Faculty currently enrolled in Ph.D. programs"
        >
          <div className="kpi-card__header">
            <span className="kpi-label">Pursuing Ph.D.</span>
            <span className="kpi-badge kpi-badge--blue">{qualificationStats.pursuingPct}%</span>
          </div>
          <div className="kpi-value">{qualificationStats.pursuing}</div>
          <div className="kpi-foot">
            <span>Enrolled in doctoral studies</span>
            <span className="kpi-foot-sub">M.E. qualification</span>
          </div>
        </div>

        {/* Card 4: Regular Cadre */}
        <div
          className="kpi-card"
          onClick={() =>
            onNavigateToRegister({
              department: selectedDept !== 'All' ? selectedDept : undefined,
              status: activeOnly ? 'Y' : 'All',
            })
          }
          role="button"
          tabIndex={0}
          title="Regular vs Contract faculty"
        >
          <div className="kpi-card__header">
            <span className="kpi-label">Regular Faculty</span>
            <span className="kpi-badge kpi-badge--green">{associationStats.regularPct}%</span>
          </div>
          <div className="kpi-value">{associationStats.regular}</div>
          <div className="kpi-foot">
            <span>Contract / Ad hoc: <strong>{associationStats.contract}</strong></span>
          </div>
        </div>

        {/* Card 5: Average Experience */}
        <div className="kpi-card">
          <div className="kpi-card__header">
            <span className="kpi-label">Avg. Retention</span>
            <span className="kpi-badge kpi-badge--gray">{experienceStats.count} tracked</span>
          </div>
          <div className="kpi-value">{experienceStats.avg} <small className="kpi-unit">yrs</small></div>
          <div className="kpi-foot">
            <span>Mean tenure in institution</span>
          </div>
        </div>
      </div>

      {/* Analytics Rows */}
      <div className="dashboard-grid-two">
        {/* Panel A: Qualification Profile */}
        <div className="panel chart-panel">
          <div className="chart-panel__header">
            <div>
              <h3 className="chart-panel__title">Qualification Profile</h3>
              <p className="chart-panel__sub">Highest degree credentials of evaluated faculty ({evalRecords.length})</p>
            </div>
            <span className="stat-pill-label">
              Total Ph.D. + Pursuing: <strong>{qualificationStats.phd + qualificationStats.pursuing}</strong>
            </span>
          </div>

          {/* Visual Stacked Bar */}
          <div className="stacked-bar">
            {qualificationStats.phd > 0 && (
              <div
                className="stacked-bar__segment segment--phd"
                style={{ width: `${(qualificationStats.phd / evalRecords.length) * 100}%` }}
                title={`Ph.D.: ${qualificationStats.phd} (${qualificationStats.phdPct}%)`}
              />
            )}
            {qualificationStats.pursuing > 0 && (
              <div
                className="stacked-bar__segment segment--pursuing"
                style={{ width: `${(qualificationStats.pursuing / evalRecords.length) * 100}%` }}
                title={`M.E. (Pursuing Ph.D.): ${qualificationStats.pursuing} (${qualificationStats.pursuingPct}%)`}
              />
            )}
            {qualificationStats.me > 0 && (
              <div
                className="stacked-bar__segment segment--me"
                style={{ width: `${(qualificationStats.me / evalRecords.length) * 100}%` }}
                title={`M.E.: ${qualificationStats.me} (${qualificationStats.mePct}%)`}
              />
            )}
            {qualificationStats.other > 0 && (
              <div
                className="stacked-bar__segment segment--other"
                style={{ width: `${(qualificationStats.other / evalRecords.length) * 100}%` }}
                title={`Other: ${qualificationStats.other} (${qualificationStats.otherPct}%)`}
              />
            )}
          </div>

          <div className="breakdown-list">
            <div className="breakdown-row">
              <div className="breakdown-label">
                <span className="legend-dot segment--phd" />
                <span>Doctorates (Ph.D.)</span>
              </div>
              <div className="breakdown-stat">
                <strong>{qualificationStats.phd}</strong>
                <span className="breakdown-pct">{qualificationStats.phdPct}%</span>
              </div>
            </div>

            <div className="breakdown-row">
              <div className="breakdown-label">
                <span className="legend-dot segment--pursuing" />
                <span>M.E. (Pursuing Ph.D.)</span>
              </div>
              <div className="breakdown-stat">
                <strong>{qualificationStats.pursuing}</strong>
                <span className="breakdown-pct">{qualificationStats.pursuingPct}%</span>
              </div>
            </div>

            <div className="breakdown-row">
              <div className="breakdown-label">
                <span className="legend-dot segment--me" />
                <span>M.E.</span>
              </div>
              <div className="breakdown-stat">
                <strong>{qualificationStats.me}</strong>
                <span className="breakdown-pct">{qualificationStats.mePct}%</span>
              </div>
            </div>

            {qualificationStats.other > 0 && (
              <div className="breakdown-row">
                <div className="breakdown-label">
                  <span className="legend-dot segment--other" />
                  <span>Other degrees</span>
                </div>
                <div className="breakdown-stat">
                  <strong>{qualificationStats.other}</strong>
                  <span className="breakdown-pct">{qualificationStats.otherPct}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel B: Cadre Distribution (AICTE Cadre Ratio) */}
        <div className="panel chart-panel">
          <div className="chart-panel__header">
            <div>
              <h3 className="chart-panel__title">Cadre & Designation Structure</h3>
              <p className="chart-panel__sub">
                Distribution across Professor, Associate Professor, and Assistant Professor tiers
              </p>
            </div>
            <span className="stat-pill-label">
              AICTE Target Ratio: <strong>1 : 2 : 6</strong>
            </span>
          </div>

          {/* Stacked bar */}
          <div className="stacked-bar">
            {cadreStats.prof > 0 && (
              <div
                className="stacked-bar__segment segment--prof"
                style={{ width: `${(cadreStats.prof / evalRecords.length) * 100}%` }}
                title={`Professor: ${cadreStats.prof} (${cadreStats.profPct}%)`}
              />
            )}
            {cadreStats.assoc > 0 && (
              <div
                className="stacked-bar__segment segment--assoc"
                style={{ width: `${(cadreStats.assoc / evalRecords.length) * 100}%` }}
                title={`Associate Professor: ${cadreStats.assoc} (${cadreStats.assocPct}%)`}
              />
            )}
            {cadreStats.asst > 0 && (
              <div
                className="stacked-bar__segment segment--asst"
                style={{ width: `${(cadreStats.asst / evalRecords.length) * 100}%` }}
                title={`Assistant Professor: ${cadreStats.asst} (${cadreStats.asstPct}%)`}
              />
            )}
            {cadreStats.other > 0 && (
              <div
                className="stacked-bar__segment segment--other"
                style={{ width: `${(cadreStats.other / evalRecords.length) * 100}%` }}
                title={`Other: ${cadreStats.other} (${cadreStats.otherPct}%)`}
              />
            )}
          </div>

          <div className="breakdown-list">
            <div
              className="breakdown-row clickable"
              onClick={() =>
                onNavigateToRegister({
                  department: selectedDept !== 'All' ? selectedDept : undefined,
                  designation: 'Professor',
                  status: activeOnly ? 'Y' : 'All',
                })
              }
              title="Click to view Professors in register"
            >
              <div className="breakdown-label">
                <span className="legend-dot segment--prof" />
                <span>Professors</span>
              </div>
              <div className="breakdown-stat">
                <strong>{cadreStats.prof}</strong>
                <span className="breakdown-pct">{cadreStats.profPct}%</span>
              </div>
            </div>

            <div
              className="breakdown-row clickable"
              onClick={() =>
                onNavigateToRegister({
                  department: selectedDept !== 'All' ? selectedDept : undefined,
                  designation: 'Associate Professor',
                  status: activeOnly ? 'Y' : 'All',
                })
              }
              title="Click to view Associate Professors in register"
            >
              <div className="breakdown-label">
                <span className="legend-dot segment--assoc" />
                <span>Associate Professors</span>
              </div>
              <div className="breakdown-stat">
                <strong>{cadreStats.assoc}</strong>
                <span className="breakdown-pct">{cadreStats.assocPct}%</span>
              </div>
            </div>

            <div
              className="breakdown-row clickable"
              onClick={() =>
                onNavigateToRegister({
                  department: selectedDept !== 'All' ? selectedDept : undefined,
                  designation: 'Assistant Professor',
                  status: activeOnly ? 'Y' : 'All',
                })
              }
              title="Click to view Assistant Professors in register"
            >
              <div className="breakdown-label">
                <span className="legend-dot segment--asst" />
                <span>Assistant Professors</span>
              </div>
              <div className="breakdown-stat">
                <strong>{cadreStats.asst}</strong>
                <span className="breakdown-pct">{cadreStats.asstPct}%</span>
              </div>
            </div>

            {cadreStats.other > 0 && (
              <div className="breakdown-row">
                <div className="breakdown-label">
                  <span className="legend-dot segment--other" />
                  <span>Other designations</span>
                </div>
                <div className="breakdown-stat">
                  <strong>{cadreStats.other}</strong>
                  <span className="breakdown-pct">{cadreStats.otherPct}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Experience & Tenure Breakdown */}
      <div className="panel chart-panel" style={{ marginTop: 20 }}>
        <div className="chart-panel__header">
          <div>
            <h3 className="chart-panel__title">Institutional Experience & Retention</h3>
            <p className="chart-panel__sub">Service duration at this institution</p>
          </div>
          <span className="stat-pill-label">
            Average Tenure: <strong>{experienceStats.avg} years</strong>
          </span>
        </div>

        <div className="tenure-grid">
          <div className="tenure-card">
            <span className="tenure-badge">&lt; 2 yrs</span>
            <div className="tenure-count">{experienceStats.under2}</div>
            <span className="tenure-desc">Recent Joinees</span>
          </div>

          <div className="tenure-card">
            <span className="tenure-badge">2 – 5 yrs</span>
            <div className="tenure-count">{experienceStats.twoTo5}</div>
            <span className="tenure-desc">Established Faculty</span>
          </div>

          <div className="tenure-card">
            <span className="tenure-badge">5 – 10 yrs</span>
            <div className="tenure-count">{experienceStats.fiveTo10}</div>
            <span className="tenure-desc">Senior Faculty</span>
          </div>

          <div className="tenure-card">
            <span className="tenure-badge">&gt; 10 yrs</span>
            <div className="tenure-count">{experienceStats.over10}</div>
            <span className="tenure-desc">Anchor Faculty</span>
          </div>
        </div>
      </div>

      {/* Comparative Department Matrix */}
      <div className="panel chart-panel" style={{ marginTop: 20 }}>
        <div className="chart-panel__header">
          <div>
            <h3 className="chart-panel__title">Department Comparative Summary</h3>
            <p className="chart-panel__sub">
              Comparison across academic departments ({departmentBreakdown.length} departments)
            </p>
          </div>
        </div>

        <div className="table-scroll">
          <table className="ledger">
            <thead>
              <tr>
                <th>Department</th>
                <th>Staff Strength</th>
                <th>Ph.D. Holders</th>
                <th>Pursuing Ph.D.</th>
                <th>Cadre (Prof / Assoc / Asst)</th>
                <th>Association</th>
                <th>Avg. Experience</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {departmentBreakdown.map((d) => (
                <tr key={d.name}>
                  <td className="name">{d.name}</td>
                  <td>
                    <strong>{d.active}</strong> active
                    {d.total > d.active && <span className="hint"> ({d.total} total)</span>}
                  </td>
                  <td>
                    <span className="stamp stamp--brass">{d.phd} ({d.phdPct}%)</span>
                  </td>
                  <td>
                    <span className="stamp stamp--blue">{d.pursuing}</span>
                  </td>
                  <td className="mono">
                    {d.prof}P / {d.assoc}Assoc / {d.asst}Asst
                  </td>
                  <td>
                    <span className="stamp stamp--regular">{d.regular} Reg</span>{' '}
                    {d.contract > 0 && <span className="stamp stamp--contract">{d.contract} Cont</span>}
                  </td>
                  <td className="mono">{d.avgExp} yrs</td>
                  <td>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() =>
                        onNavigateToRegister({
                          department: d.name,
                          status: activeOnly ? 'Y' : 'All',
                        })
                      }
                      title={`View ${d.name} in register`}
                    >
                      View in Register →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
