import { useMemo, useState } from 'react';
import type { FacultyRecord } from '../types';
import { normalizeDepartment } from '../departmentUtils';
import { normalizeDesignation } from '../designationUtils';
import { isPhdDegree, parseDegree } from '../degreeUtils';
import { calcExperienceYears } from '../dateUtils';

interface DashboardProps {
  records: FacultyRecord[];
  onNavigateToRegister: (filters?: {
    department?: string;
    designation?: string;
    status?: 'All' | 'Y' | 'N';
    query?: string;
  }) => void;
}

function getDeptMeta(name: string): { code: string; tag: string; dotColor: string } {
  const lower = name.toLowerCase();
  if (lower.includes('science engineering') || lower.includes('cse')) {
    return { code: 'CSE', tag: 'NBA Accredited', dotColor: 'bg-sky-600' };
  }
  if (lower.includes('electronics') || lower.includes('ecs')) {
    return { code: 'ECS', tag: 'AICTE Sanctioned', dotColor: 'bg-emerald-600' };
  }
  if (lower.includes('mechanical') || lower.includes('mech')) {
    return { code: 'MECH', tag: 'NBA Re-accredited', dotColor: 'bg-slate-700' };
  }
  if (lower.includes('computer')) {
    return { code: 'COMP', tag: 'NBA Accredited', dotColor: 'bg-indigo-600' };
  }
  return { code: name.slice(0, 4).toUpperCase(), tag: 'AICTE Approved', dotColor: 'bg-slate-600' };
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
      if (isPhdDegree(r.highestDegree)) {
        phd++;
      } else {
        const { baseDegree, pursuingPhd } = parseDegree(r.highestDegree);
        const isPursuing = r.pursuingPhd ?? pursuingPhd;
        if (isPursuing) {
          pursuing++;
        } else if (baseDegree === 'ME') {
          me++;
        } else {
          other++;
        }
      }
    });

    const total = evalRecords.length;
    const phdPct = total > 0 ? Math.round((phd / total) * 100) : 0;
    const pursuingPct = total > 0 ? Math.round((pursuing / total) * 100) : 0;
    const mePct = total > 0 ? Math.round((me / total) * 100) : 0;
    const otherPct = total > 0 ? Math.max(0, 100 - phdPct - pursuingPct - mePct) : 0;

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
    const otherPct = total > 0 ? Math.max(0, 100 - profPct - assocPct - asstPct) : 0;

    return { prof, assoc, asst, other, profPct, assocPct, asstPct, otherPct, total };
  }, [evalRecords]);

  // Cadre Ratio computation (relative to Professor)
  const profBase = cadreStats.prof > 0 ? cadreStats.prof : 1;
  const assocRatioNum = parseFloat((cadreStats.assoc / profBase).toFixed(1));
  const asstRatioNum = parseFloat((cadreStats.asst / profBase).toFixed(1));
  const observedRatioStr = `Actual: 1.0 : ${assocRatioNum} : ${asstRatioNum}`;

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

    const avg = count > 0 ? (sum / count).toFixed(1) : '0.0';
    return { avg, count, under2, twoTo5, fiveTo10, over10 };
  }, [evalRecords]);

  const tenureCount = experienceStats.count > 0 ? experienceStats.count : 1;
  const under2Pct = Math.round((experienceStats.under2 / tenureCount) * 100);
  const twoTo5Pct = Math.round((experienceStats.twoTo5 / tenureCount) * 100);
  const fiveTo10Pct = Math.round((experienceStats.fiveTo10 / tenureCount) * 100);
  const over10Pct = Math.round((experienceStats.over10 / tenureCount) * 100);

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

      if (!activeOnly || isActive) {
        if (isPhdDegree(r.highestDegree)) {
          entry.phd++;
        } else {
          const { pursuingPhd } = parseDegree(r.highestDegree);
          const isPursuing = r.pursuingPhd ?? pursuingPhd;
          if (isPursuing) entry.pursuing++;
        }

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
      .map(([name, data]) => {
        const evalCount = activeOnly ? data.active : data.total;
        return {
          name,
          ...data,
          avgExp: data.expCount > 0 ? (data.expSum / data.expCount).toFixed(1) : '—',
          evalCount,
          phdPct: evalCount > 0 ? Math.round((data.phd / evalCount) * 100) : 0,
          pursuingPct: evalCount > 0 ? Math.round((data.pursuing / evalCount) * 100) : 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [records, activeOnly]);

  // Overall totals for matrix footer
  const totalActive = departmentBreakdown.reduce((acc, d) => acc + d.active, 0);
  const totalAll = departmentBreakdown.reduce((acc, d) => acc + d.total, 0);
  const totalPhd = departmentBreakdown.reduce((acc, d) => acc + d.phd, 0);
  const totalPursuing = departmentBreakdown.reduce((acc, d) => acc + d.pursuing, 0);
  const totalProf = departmentBreakdown.reduce((acc, d) => acc + d.prof, 0);
  const totalAssoc = departmentBreakdown.reduce((acc, d) => acc + d.assoc, 0);
  const totalAsst = departmentBreakdown.reduce((acc, d) => acc + d.asst, 0);
  const totalRegular = departmentBreakdown.reduce((acc, d) => acc + d.regular, 0);
  const totalContract = departmentBreakdown.reduce((acc, d) => acc + d.contract, 0);
  const totalExpSum = departmentBreakdown.reduce((acc, d) => acc + d.expSum, 0);
  const totalExpCount = departmentBreakdown.reduce((acc, d) => acc + d.expCount, 0);
  const overallAvgExp = totalExpCount > 0 ? (totalExpSum / totalExpCount).toFixed(1) : '—';
  const overallPhdPct = totalActive > 0 ? Math.round((totalPhd / totalActive) * 100) : 0;
  const overallPursuingPct = totalActive > 0 ? Math.round((totalPursuing / totalActive) * 100) : 0;

  function handleExportCadreCSV() {
    const headers = [
      'Department',
      'Active Staff',
      'Total On File',
      'Left Staff',
      'PhD Holders',
      'PhD Percentage',
      'Pursuing PhD',
      'Professors',
      'Associate Professors',
      'Assistant Professors',
      'Regular Faculty',
      'Contract / Ad-hoc',
      'Average Experience (Years)',
    ];
    const rows = departmentBreakdown.map((d) => [
      `"${d.name.replace(/"/g, '""')}"`,
      d.active,
      d.total,
      d.total - d.active,
      d.phd,
      `${d.phdPct}%`,
      d.pursuing,
      d.prof,
      d.assoc,
      d.asst,
      d.regular,
      d.contract,
      d.avgExp,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fr_CRCE_Cadre_Accreditation_Summary_${new Date().getFullYear()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 border border-slate-200/80 shadow-sm text-center max-w-xl mx-auto my-12">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
          <span className="material-symbols-outlined text-2xl">folder_open</span>
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">No faculty records in register</h3>
        <p className="text-xs text-slate-500 mb-4">
          Add faculty records or import your department spreadsheet to view institutional analytics.
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-sm"
          onClick={() => onNavigateToRegister()}
        >
          <span>Open Register</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Executive Scope Strip & Filter Bar */}
      <section className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
              Audit Console
            </span>
            <span>•</span>
            <span className="text-emerald-700 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Verified Live Database
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Institutional Faculty Overview</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Live staffing metrics, Ph.D. terminal ratios, cadre compliance (1:2:6), and departmental breakdown.
          </p>
        </div>

        {/* Control Group */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Department Select */}
          <div className="relative min-w-[210px]">
            <select
              aria-label="Department Filter"
              className="w-full appearance-none bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold py-2 pl-3 pr-8 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors cursor-pointer"
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
            <span className="material-symbols-outlined text-[18px] text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
              unfold_more
            </span>
          </div>

          {/* Segmented Toggle */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80">
            <button
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                activeOnly ? 'text-slate-900 bg-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              type="button"
              onClick={() => setActiveOnly(true)}
              title="Include only currently associated faculty"
            >
              Active ({activeCount})
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                !activeOnly ? 'text-slate-900 bg-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
              type="button"
              onClick={() => setActiveOnly(false)}
              title="Include all faculty records, including left"
            >
              All ({totalInScope})
            </button>
          </div>

          {/* Action Export/Open */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-sm cursor-pointer"
            onClick={() =>
              onNavigateToRegister({
                department: selectedDept !== 'All' ? selectedDept : undefined,
                status: activeOnly ? 'Y' : 'All',
              })
            }
            title="Open the faculty register with current filters"
          >
            <span>Open Full Register</span>
            <span className="material-symbols-outlined text-[16px] text-slate-300">arrow_forward</span>
          </button>
        </div>
      </section>

      {/* Section 2: Modern Metric Strip (5 Compact Cards with Sparkline Visuals) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Active Faculty */}
        <div
          className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow transition-shadow flex flex-col justify-between cursor-pointer"
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
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Faculty</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {activeRate}% Active
            </span>
          </div>
          <div className="my-2">
            <div className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight">{activeCount}</div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2.5">
              <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${activeRate}%` }}></div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Total records: <strong className="text-slate-700 font-mono">{totalInScope}</strong>
            </span>
            {leftCount > 0 && <span className="text-amber-600 font-medium font-mono">{leftCount} left</span>}
          </div>
        </div>

        {/* KPI 2: Ph.D. Holders */}
        <div
          className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow transition-shadow flex flex-col justify-between cursor-pointer"
          onClick={() =>
            onNavigateToRegister({
              department: selectedDept !== 'All' ? selectedDept : undefined,
              status: activeOnly ? 'Y' : 'All',
              query: 'PhD',
            })
          }
          role="button"
          tabIndex={0}
          title="Click to view Ph.D. holders in register"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ph.D. Holders</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {qualificationStats.phdPct}% Ratio
            </span>
          </div>
          <div className="my-2">
            <div className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight">{qualificationStats.phd}</div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2.5">
              <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${qualificationStats.phdPct}%` }}></div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Doctoral guides</span>
            <span className="font-mono text-slate-600">{evalRecords.length - qualificationStats.phd} Non-Ph.D.</span>
          </div>
        </div>

        {/* KPI 3: Pursuing Ph.D. */}
        <div
          className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow transition-shadow flex flex-col justify-between cursor-pointer"
          onClick={() =>
            onNavigateToRegister({
              department: selectedDept !== 'All' ? selectedDept : undefined,
              status: activeOnly ? 'Y' : 'All',
              query: 'pursuing',
            })
          }
          role="button"
          tabIndex={0}
          title="Click to view faculty pursuing Ph.D. in register"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pursuing Ph.D.</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              {qualificationStats.pursuingPct}% Enrolled
            </span>
          </div>
          <div className="my-2">
            <div className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight">{qualificationStats.pursuing}</div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2.5">
              <div className="bg-sky-500 h-full rounded-full transition-all" style={{ width: `${qualificationStats.pursuingPct}%` }}></div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Enrolled candidates</span>
            <span className="text-slate-600 font-medium">M.E. Roster</span>
          </div>
        </div>

        {/* KPI 4: Regular Cadre */}
        <div
          className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow transition-shadow flex flex-col justify-between cursor-pointer"
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
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Regular Cadre</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {associationStats.regularPct}% Tenured
            </span>
          </div>
          <div className="my-2">
            <div className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight">{associationStats.regular}</div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2.5">
              <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${associationStats.regularPct}%` }}></div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Permanent faculty</span>
            <span className="font-mono text-slate-600">{associationStats.contract} Ad-hoc</span>
          </div>
        </div>

        {/* KPI 5: Avg. Retention */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow transition-shadow flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg. Retention</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {experienceStats.count} Tracked
            </span>
          </div>
          <div className="my-2">
            <div className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight">
              {experienceStats.avg} <span className="text-sm font-sans font-normal text-slate-500">yrs</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2.5">
              <div
                className="bg-slate-700 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round((parseFloat(experienceStats.avg) / 15) * 100))}%` }}
              ></div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Mean tenure record</span>
            <span className="text-slate-600 font-medium">Bandra Campus</span>
          </div>
        </div>
      </section>

      {/* Section 3: Split Analytics Layout (Qualification Donut + Linear Breakdown & AICTE Cadre Compliance) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget A: Faculty Qualification Ledger */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            {/* Widget Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Faculty Qualification Ledger</h3>
                <p className="text-xs text-slate-500">Doctoral attainment &amp; terminal credentials (Cohort: {evalRecords.length})</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                Ph.D. + Pursuing: {qualificationStats.phd + qualificationStats.pursuing} (
                {Math.min(100, qualificationStats.phdPct + qualificationStats.pursuingPct)}%)
              </span>
            </div>

            {/* Donut + Linear Cohort Overview */}
            <div className="py-4 flex flex-col sm:flex-row items-center gap-5">
              {/* SVG Donut Chart */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background circle */}
                  <path
                    className="text-slate-100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  {/* Segment 1: Ph.D. */}
                  {qualificationStats.phdPct > 0 && (
                    <path
                      className="text-indigo-600"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${qualificationStats.phdPct}, 100`}
                      strokeLinecap="round"
                      strokeWidth="4.2"
                    />
                  )}
                  {/* Segment 2: Pursuing Ph.D. */}
                  {qualificationStats.pursuingPct > 0 && (
                    <path
                      className="text-sky-500"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${qualificationStats.pursuingPct}, 100`}
                      strokeDashoffset={`-${qualificationStats.phdPct}`}
                      strokeWidth="4.2"
                    />
                  )}
                  {/* Segment 3: M.E. Completed */}
                  {qualificationStats.mePct > 0 && (
                    <path
                      className="text-emerald-500"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${qualificationStats.mePct}, 100`}
                      strokeDashoffset={`-${qualificationStats.phdPct + qualificationStats.pursuingPct}`}
                      strokeWidth="4.2"
                    />
                  )}
                  {/* Segment 4: Other */}
                  {qualificationStats.otherPct > 0 && (
                    <path
                      className="text-slate-400"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray={`${qualificationStats.otherPct}, 100`}
                      strokeDashoffset={`-${qualificationStats.phdPct + qualificationStats.pursuingPct + qualificationStats.mePct}`}
                      strokeWidth="4.2"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-base font-extrabold text-slate-900 leading-none">{evalRecords.length}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{activeOnly ? 'Active' : 'Total'}</span>
                </div>
              </div>

              {/* Multi-segment Linear Progress Bar & Legend */}
              <div className="w-full space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span className="font-medium">Cohort Qualification Mix</span>
                  <span className="font-mono font-semibold text-slate-700">100% Evaluated</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  {qualificationStats.phd > 0 && (
                    <div
                      className="bg-indigo-600 h-full transition-all"
                      style={{ width: `${qualificationStats.phdPct}%` }}
                      title={`Ph.D. Completed: ${qualificationStats.phd} (${qualificationStats.phdPct}%)`}
                    ></div>
                  )}
                  {qualificationStats.pursuing > 0 && (
                    <div
                      className="bg-sky-500 h-full transition-all"
                      style={{ width: `${qualificationStats.pursuingPct}%` }}
                      title={`Pursuing Ph.D.: ${qualificationStats.pursuing} (${qualificationStats.pursuingPct}%)`}
                    ></div>
                  )}
                  {qualificationStats.me > 0 && (
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${qualificationStats.mePct}%` }}
                      title={`M.E. Completed: ${qualificationStats.me} (${qualificationStats.mePct}%)`}
                    ></div>
                  )}
                  {qualificationStats.other > 0 && (
                    <div
                      className="bg-slate-400 h-full transition-all"
                      style={{ width: `${qualificationStats.otherPct}%` }}
                      title={`Other Degrees: ${qualificationStats.other} (${qualificationStats.otherPct}%)`}
                    ></div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>Ph.D. ({qualificationStats.phdPct}%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>Pursuing ({qualificationStats.pursuingPct}%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>Master's ({qualificationStats.mePct}%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>Other ({qualificationStats.otherPct}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Structured Rows */}
            <div className="divide-y divide-slate-100 mt-2">
              <div
                className="py-2.5 flex items-center justify-between hover:bg-slate-50/70 px-2 rounded-lg transition-colors cursor-pointer"
                onClick={() =>
                  onNavigateToRegister({
                    department: selectedDept !== 'All' ? selectedDept : undefined,
                    status: activeOnly ? 'Y' : 'All',
                    query: 'PhD',
                  })
                }
                title="Click to view Ph.D. holders in register"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-600 shrink-0"></span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">Doctor of Philosophy (Ph.D.)</span>
                    <span className="text-[11px] text-slate-500">Completed doctorate with recognized guide registration</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-slate-900">{qualificationStats.phd}</span>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 w-14 text-center">
                    {qualificationStats.phdPct}%
                  </span>
                </div>
              </div>

              <div
                className="py-2.5 flex items-center justify-between hover:bg-slate-50/70 px-2 rounded-lg transition-colors cursor-pointer"
                onClick={() =>
                  onNavigateToRegister({
                    department: selectedDept !== 'All' ? selectedDept : undefined,
                    status: activeOnly ? 'Y' : 'All',
                    query: 'pursuing',
                  })
                }
                title="Click to view faculty pursuing Ph.D. in register"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded bg-sky-500 shrink-0"></span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">M.E. / M.Tech (Pursuing Ph.D.)</span>
                    <span className="text-[11px] text-slate-500">Doctoral candidates registered in recognized university labs</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-slate-900">{qualificationStats.pursuing}</span>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 w-14 text-center">
                    {qualificationStats.pursuingPct}%
                  </span>
                </div>
              </div>

              <div
                className="py-2.5 flex items-center justify-between hover:bg-slate-50/70 px-2 rounded-lg transition-colors cursor-pointer"
                onClick={() =>
                  onNavigateToRegister({
                    department: selectedDept !== 'All' ? selectedDept : undefined,
                    status: activeOnly ? 'Y' : 'All',
                    query: 'ME',
                  })
                }
                title="Click to view M.E. faculty in register"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0"></span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">M.E. / M.Tech Completed</span>
                    <span className="text-[11px] text-slate-500">Master of Engineering terminal academic qualification</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-slate-900">{qualificationStats.me}</span>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 w-14 text-center">
                    {qualificationStats.mePct}%
                  </span>
                </div>
              </div>

              {qualificationStats.other > 0 && (
                <div className="py-2.5 flex items-center justify-between hover:bg-slate-50/70 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded bg-slate-400 shrink-0"></span>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">Other Allied Specs</span>
                      <span className="text-[11px] text-slate-500">B.E. senior cadre / MCA / Mathematics &amp; Sciences</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-slate-900">{qualificationStats.other}</span>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 w-14 text-center">
                      {qualificationStats.otherPct}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Widget B: AICTE Cadre Distribution & Ratio Balance */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            {/* Widget Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">AICTE Cadre Distribution</h3>
                <p className="text-xs text-slate-500">Statutory Cadre Ratio: Professor : Assoc. Prof : Asst. Prof</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                Norm: 1 : 2 : 6
              </span>
            </div>

            {/* Multi-segment Cadre Stack Bar */}
            <div className="my-4 space-y-1.5">
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span className="font-medium">Observed Cadre Proportion</span>
                <span className="font-mono font-bold text-slate-900">{observedRatioStr}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                {cadreStats.prof > 0 && (
                  <div
                    className="bg-slate-900 h-full transition-all"
                    style={{ width: `${cadreStats.profPct}%` }}
                    title={`Professors: ${cadreStats.prof} (${cadreStats.profPct}%)`}
                  ></div>
                )}
                {cadreStats.assoc > 0 && (
                  <div
                    className="bg-indigo-600 h-full transition-all"
                    style={{ width: `${cadreStats.assocPct}%` }}
                    title={`Associate Professors: ${cadreStats.assoc} (${cadreStats.assocPct}%)`}
                  ></div>
                )}
                {cadreStats.asst > 0 && (
                  <div
                    className="bg-emerald-600 h-full transition-all"
                    style={{ width: `${cadreStats.asstPct}%` }}
                    title={`Assistant Professors: ${cadreStats.asst} (${cadreStats.asstPct}%)`}
                  ></div>
                )}
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                <span>Professors ({cadreStats.profPct}%)</span>
                <span>Associate Professors ({cadreStats.assocPct}%)</span>
                <span>Assistant Professors ({cadreStats.asstPct}%)</span>
              </div>
            </div>

            {/* Cadre Benchmark Rows with Modern Enterprise Badges */}
            <div className="space-y-2.5 mt-3">
              {/* Professor Card */}
              <div
                className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() =>
                  onNavigateToRegister({
                    department: selectedDept !== 'All' ? selectedDept : undefined,
                    designation: 'Professor',
                    status: activeOnly ? 'Y' : 'All',
                  })
                }
                title="Click to view Professors in register"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-slate-900 rounded-full"></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Professors (HAG / Level 14)</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold">
                        Cadre 1
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Target Ratio: 1 part (Actual: 1.0)</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-slate-900 block leading-tight">{cadreStats.prof}</span>
                    <span className="font-mono text-[11px] text-slate-500">{cadreStats.profPct}%</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span> Compliant
                  </span>
                </div>
              </div>

              {/* Associate Professor Card */}
              <div
                className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() =>
                  onNavigateToRegister({
                    department: selectedDept !== 'All' ? selectedDept : undefined,
                    designation: 'Associate Professor',
                    status: activeOnly ? 'Y' : 'All',
                  })
                }
                title="Click to view Associate Professors in register"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Associate Professors (Level 13A)</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                        Cadre 2
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Target Ratio: 2 parts (Actual: {assocRatioNum})</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-slate-900 block leading-tight">{cadreStats.assoc}</span>
                    <span className="font-mono text-[11px] text-slate-500">{cadreStats.assocPct}%</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span> Compliant
                  </span>
                </div>
              </div>

              {/* Assistant Professor Card */}
              <div
                className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() =>
                  onNavigateToRegister({
                    department: selectedDept !== 'All' ? selectedDept : undefined,
                    designation: 'Assistant Professor',
                    status: activeOnly ? 'Y' : 'All',
                  })
                }
                title="Click to view Assistant Professors in register"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-emerald-600 rounded-full"></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Assistant Professors (Level 10-12)</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                        Cadre 6
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Target Ratio: 6 parts (Actual: {asstRatioNum})</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-slate-900 block leading-tight">{cadreStats.asst}</span>
                    <span className="font-mono text-[11px] text-slate-500">{cadreStats.asstPct}%</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    <span className="material-symbols-outlined text-[14px]">tune</span> Within Bounds
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Institutional Experience & Retention Cohorts (Tenure Bands) */}
      <section className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Institutional Experience &amp; Retention Cohorts
            </h3>
            <p className="text-xs text-slate-500">
              Tenure distribution and institutional stability index across active teaching personnel
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 self-start sm:self-auto">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">history_edu</span>
            Mean Institutional Tenure: <span className="font-mono font-bold text-slate-900">{experienceStats.avg} Years</span>
          </div>
        </div>

        {/* 4 Tenure Cohort Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Band 1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-white rounded border border-slate-200 text-slate-700">
                  &lt; 2 Years
                </span>
                <span className="font-mono text-xs font-bold text-slate-600">{under2Pct}%</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Joinees</h4>
              <div className="font-mono text-2xl font-extrabold text-slate-900 mt-1">
                {experienceStats.under2} <span className="text-xs font-sans font-medium text-slate-500">faculty</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Induction &amp; probation phase</p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-200/60">
              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                <div className="bg-slate-400 h-full rounded-full transition-all" style={{ width: `${under2Pct}%` }}></div>
              </div>
            </div>
          </div>

          {/* Band 2 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-white rounded border border-slate-200 text-indigo-700">
                  2 – 5 Years
                </span>
                <span className="font-mono text-xs font-bold text-indigo-600">{twoTo5Pct}%</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Established Faculty</h4>
              <div className="font-mono text-2xl font-extrabold text-slate-900 mt-1">
                {experienceStats.twoTo5} <span className="text-xs font-sans font-medium text-slate-500">faculty</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Core instructional cadre</p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-200/60">
              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${twoTo5Pct}%` }}></div>
              </div>
            </div>
          </div>

          {/* Band 3 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-white rounded border border-slate-200 text-emerald-700">
                  5 – 10 Years
                </span>
                <span className="font-mono text-xs font-bold text-emerald-600">{fiveTo10Pct}%</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Senior Faculty</h4>
              <div className="font-mono text-2xl font-extrabold text-slate-900 mt-1">
                {experienceStats.fiveTo10} <span className="text-xs font-sans font-medium text-slate-500">faculty</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Departmental labs &amp; research</p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-200/60">
              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${fiveTo10Pct}%` }}></div>
              </div>
            </div>
          </div>

          {/* Band 4 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-white rounded border border-slate-200 text-slate-900 font-bold">
                  &gt; 10 Years
                </span>
                <span className="font-mono text-xs font-bold text-slate-900">{over10Pct}%</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Anchor Faculty</h4>
              <div className="font-mono text-2xl font-extrabold text-slate-900 mt-1">
                {experienceStats.over10} <span className="text-xs font-sans font-medium text-slate-500">faculty</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Institutional pillars &amp; deans</p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-200/60">
              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                <div className="bg-slate-900 h-full rounded-full transition-all" style={{ width: `${over10Pct}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Department Comparative Summary Matrix Ledger (Modern Data Grid) */}
      <section className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        {/* Table Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-700 text-[20px]">account_balance</span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Department Comparative Ledger</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparative review of cadre strength, terminal credentials, and employment associations ({departmentBreakdown.length} departments)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-xs cursor-pointer"
              type="button"
              onClick={handleExportCadreCSV}
              title="Download Department Cadre CSV report"
            >
              <span className="material-symbols-outlined text-[16px] text-slate-500">file_download</span>
              Export Cadre CSV (NBA / NAAC)
            </button>
          </div>
        </div>

        {/* High-Fidelity Data Grid */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-3 text-right">Staff Strength</th>
                <th className="py-3 px-3 text-center">Ph.D. Holders</th>
                <th className="py-3 px-3 text-center">Pursuing Ph.D.</th>
                <th className="py-3 px-3 text-center">Cadre (Prof / Assoc / Asst)</th>
                <th className="py-3 px-3 text-center">Association</th>
                <th className="py-3 px-3 text-right">Avg. Exp.</th>
                <th className="py-3 px-4 text-right">Ledger Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs text-slate-700 font-normal">
              {departmentBreakdown.map((d) => {
                const meta = getDeptMeta(d.name);
                return (
                  <tr key={d.name} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${meta.dotColor} shrink-0`}></span>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{d.name}</span>
                          <span className="font-mono text-[11px] text-slate-500">
                            Dept Code: {meta.code} · {meta.tag}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <span className="font-mono text-xs font-bold text-slate-900">{d.active}</span>
                      <span className="font-mono text-[10px] text-slate-400 block">
                        {d.total} on file {d.total > d.active && `(${d.total - d.active} left)`}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          {d.phd} ({d.phdPct}%)
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-mono text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                        {d.pursuing} ({d.pursuingPct}%)
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex items-center divide-x divide-slate-200 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                        <span className="px-1.5 font-bold text-slate-900" title="Professors">
                          {d.prof} P
                        </span>
                        <span className="px-1.5 font-semibold text-indigo-700" title="Associate Professors">
                          {d.assoc} Assoc
                        </span>
                        <span className="px-1.5 text-slate-600" title="Assistant Professors">
                          {d.asst} Asst
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-mono text-xs text-slate-600">
                        <strong className="text-slate-900 font-bold">{d.regular}</strong> Reg ·{' '}
                        <span className="text-slate-500 font-medium">{d.contract} Ad-hoc</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-xs font-bold text-slate-900">{d.avgExp} yrs</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold text-xs transition-colors py-1 px-2 rounded hover:bg-slate-100 cursor-pointer"
                        type="button"
                        onClick={() =>
                          onNavigateToRegister({
                            department: d.name,
                            status: activeOnly ? 'Y' : 'All',
                          })
                        }
                        title={`View ${d.name} in register`}
                      >
                        <span>View</span>
                        <span className="material-symbols-outlined text-[15px]">arrow_right_alt</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Footer Summary */}
            <tfoot className="bg-slate-50/90 border-t-2 border-slate-200 font-medium text-xs text-slate-900">
              <tr>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600">verified</span>
                    <span className="font-bold">Institution Totals ({departmentBreakdown.length} Departments)</span>
                  </div>
                </td>
                <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                  {totalActive} <span className="text-[10px] text-slate-500 font-normal block">({totalAll} total)</span>
                </td>
                <td className="py-3.5 px-3 text-center">
                  <span className="font-mono font-bold text-indigo-700">{totalPhd}</span>
                  <span className="font-mono text-[10px] text-slate-500 block">({overallPhdPct}% net)</span>
                </td>
                <td className="py-3.5 px-3 text-center">
                  <span className="font-mono font-bold text-sky-700">{totalPursuing}</span>
                  <span className="font-mono text-[10px] text-slate-500 block">({overallPursuingPct}% net)</span>
                </td>
                <td className="py-3.5 px-3 text-center font-mono">
                  <span className="text-slate-900 font-bold">{totalProf} P</span> / {totalAssoc} Assoc / {totalAsst} Asst
                </td>
                <td className="py-3.5 px-3 text-center font-mono text-[11px]">
                  <strong className="text-slate-900">{totalRegular} Reg</strong> · {totalContract} Ad-hoc
                </td>
                <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">{overallAvgExp} yrs</td>
                <td className="py-3.5 px-4 text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    AICTE Validated
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Institutional Footer Bar */}
        <div className="bg-slate-50 px-4 sm:px-5 py-2.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span>Ledger Seal: FRCRCE-ACAD-2024-C33658</span>
            <span>•</span>
            <span>Data verified against Maharashtra DTE returns</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Audit Ready for National Board of Accreditation (Tier-I)</span>
          </div>
        </div>
      </section>
    </div>
  );
}
