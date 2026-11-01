import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import './App.css';
import { db, sanitizeFacultyDatabase } from './db';
import type { FacultyRecord } from './types';
import { isUnlocked, lock } from './auth';
import Dashboard from './components/Dashboard';
import FacultyForm from './components/FacultyForm';
import FacultyTable from './components/FacultyTable';
import ImportPanel from './components/ImportPanel';
import LoginGate from './components/LoginGate';

type Tab = 'dashboard' | 'register' | 'add' | 'import';

function App() {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [editingRecord, setEditingRecord] = useState<FacultyRecord | null>(null);
  const [registerFilters, setRegisterFilters] = useState<{
    department?: string;
    designation?: string;
    status?: 'All' | 'Y' | 'N';
    query?: string;
  } | null>(null);
  const records = useLiveQuery(() => db.faculty.toArray(), []) ?? [];

  useEffect(() => {
    sanitizeFacultyDatabase();
  }, []);

  if (!unlocked) {
    return <LoginGate onUnlock={() => setUnlocked(true)} />;
  }

  function handleEdit(rec: FacultyRecord) {
    setEditingRecord(rec);
    setTab('add');
  }

  function handleSaved() {
    setEditingRecord(null);
    setTab('register');
  }

  function handleLock() {
    lock();
    setUnlocked(false);
    setTab('dashboard');
    setEditingRecord(null);
    setRegisterFilters(null);
  }

  function handleNavigateToRegister(filters?: {
    department?: string;
    designation?: string;
    status?: 'All' | 'Y' | 'N';
    query?: string;
  }) {
    setRegisterFilters(filters ?? null);
    setTab('register');
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Enterprise SaaS Masthead Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar: Identity & Actions */}
          <div className="h-16 flex items-center justify-between gap-4">
            {/* Logo & Organization Context */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold tracking-tight shadow-sm shrink-0 ring-1 ring-slate-800">
                <span className="text-sm font-semibold tracking-wider text-emerald-400">CR</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
                    Fr. Conceicao Rodrigues College of Engineering
                  </span>
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    AISHE C-33658
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 leading-tight">
                  Faculty Register &amp; Staffing Ledger
                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> AICTE Compliant
                  </span>
                </h1>
              </div>
            </div>

            {/* Global Header Badges & User Meta */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Total Roster Count Pill */}
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">On Roster:</span>
                <span className="font-mono text-xs font-bold text-slate-900">{records.length}</span>
              </div>

              {/* Quick Action Lock Button */}
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                onClick={handleLock}
                title="Lock ledger session"
              >
                <span className="material-symbols-outlined text-[16px] text-slate-500">lock</span>
                <span className="hidden sm:inline">Lock Ledger</span>
              </button>

              {/* User Profile */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 leading-snug">Dr. S. Rodrigues</span>
                  <span className="text-[11px] font-medium text-slate-500">Dean (Academic Affairs)</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 shadow-xs">
                  SR
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs & Cycle Metadata */}
          <div className="flex items-center justify-between border-t border-slate-100 py-1">
            <nav className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  tab === 'dashboard'
                    ? 'font-bold text-slate-900 border-b-2 border-slate-900 -mb-[5px] rounded-none'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                onClick={() => {
                  setEditingRecord(null);
                  setTab('dashboard');
                }}
              >
                <span className={`material-symbols-outlined text-[16px] ${tab === 'dashboard' ? 'text-slate-900' : 'text-slate-400'}`}>
                  dashboard
                </span>
                Dashboard
              </button>

              <button
                type="button"
                className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  tab === 'register'
                    ? 'font-bold text-slate-900 border-b-2 border-slate-900 -mb-[5px] rounded-none'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                onClick={() => {
                  setEditingRecord(null);
                  setRegisterFilters(null);
                  setTab('register');
                }}
              >
                <span className={`material-symbols-outlined text-[16px] ${tab === 'register' ? 'text-slate-900' : 'text-slate-400'}`}>
                  table_chart
                </span>
                View Register
              </button>

              <button
                type="button"
                className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  tab === 'add'
                    ? 'font-bold text-slate-900 border-b-2 border-slate-900 -mb-[5px] rounded-none'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                onClick={() => {
                  setTab('add');
                }}
              >
                <span className={`material-symbols-outlined text-[16px] ${tab === 'add' ? 'text-slate-900' : 'text-slate-400'}`}>
                  person_add
                </span>
                {editingRecord ? 'Edit record' : 'Add record'}
              </button>

              <button
                type="button"
                className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  tab === 'import'
                    ? 'font-bold text-slate-900 border-b-2 border-slate-900 -mb-[5px] rounded-none'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                onClick={() => {
                  setEditingRecord(null);
                  setTab('import');
                }}
              >
                <span className={`material-symbols-outlined text-[16px] ${tab === 'import' ? 'text-slate-900' : 'text-slate-400'}`}>
                  upload_file
                </span>
                Import Excel
              </button>
            </nav>

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200/80">
                AY 2024–25 Audit Cycle
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-slate-600">DTE Code: 3144</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main
        className={
          tab === 'dashboard'
            ? 'flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6'
            : `main ${tab === 'register' || tab === 'import' ? 'main--wide' : ''}`
        }
      >
        {tab === 'dashboard' && <Dashboard records={records} onNavigateToRegister={handleNavigateToRegister} />}
        {tab === 'register' && (
          <FacultyTable records={records} onEdit={handleEdit} initialFilters={registerFilters} />
        )}
        {tab === 'add' && <FacultyForm onSaved={handleSaved} editingRecord={editingRecord} />}
        {tab === 'import' && <ImportPanel onImported={() => setTab('register')} />}
      </main>

      {/* Modern Enterprise Page Footer */}
      <footer className="w-full bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">Fr. CRCE</span>
            <span className="text-slate-300">|</span>
            <span>Institutional Ledger Archive &amp; AICTE Cadre Compliance Cell</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            © 2024 Father Conceicao Rodrigues College of Engineering. Bandra (W), Mumbai.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
