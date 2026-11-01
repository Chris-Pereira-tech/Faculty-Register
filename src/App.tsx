import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import './App.css';
import { db, sanitizeFacultyDatabase } from './db';
import type { FacultyRecord } from './types';
import { isUnlocked, lock } from './auth';
import { useTheme } from './theme';
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
  const [theme, toggleTheme] = useTheme();
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
    <div className="app">
      <header className="letterhead">
        <div className="letterhead__row">
          <h1 className="letterhead__title">
            Faculty Register
            <small>Department staffing records</small>
          </h1>
          <div className="letterhead__count">
            <div className="letterhead__count-row">
              Records on file
              <button
                type="button"
                className="theme-toggle-btn"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {theme === 'dark' ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
              <button type="button" className="lock-btn" onClick={handleLock}>
                Lock
              </button>
            </div>
            <strong>{records.length}</strong>
          </div>
        </div>
        <nav className="tabs">
          <button
            className={tab === 'dashboard' ? 'active' : ''}
            onClick={() => {
              setEditingRecord(null);
              setTab('dashboard');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
            Dashboard
          </button>
          <button
            className={tab === 'register' ? 'active' : ''}
            onClick={() => {
              setEditingRecord(null);
              setRegisterFilters(null);
              setTab('register');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            View register
          </button>
          <button
            className={tab === 'add' ? 'active' : ''}
            onClick={() => {
              setTab('add');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            {editingRecord ? 'Edit record' : 'Add record'}
          </button>
          <button
            className={tab === 'import' ? 'active' : ''}
            onClick={() => {
              setEditingRecord(null);
              setTab('import');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="tab-icon">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import from Excel
          </button>
        </nav>
      </header>

      <main className={`main ${tab === 'register' || tab === 'import' || tab === 'dashboard' ? 'main--wide' : ''}`}>
        {tab === 'dashboard' && (
          <Dashboard records={records} onNavigateToRegister={handleNavigateToRegister} />
        )}
        {tab === 'register' && (
          <FacultyTable
            records={records}
            onEdit={handleEdit}
            initialFilters={registerFilters}
          />
        )}
        {tab === 'add' && <FacultyForm onSaved={handleSaved} editingRecord={editingRecord} />}
        {tab === 'import' && <ImportPanel onImported={() => setTab('register')} />}
      </main>
    </div>
  );
}

export default App;
