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
            View register
          </button>
          <button
            className={tab === 'add' ? 'active' : ''}
            onClick={() => {
              setTab('add');
            }}
          >
            {editingRecord ? 'Edit record' : 'Add record'}
          </button>
          <button
            className={tab === 'import' ? 'active' : ''}
            onClick={() => {
              setEditingRecord(null);
              setTab('import');
            }}
          >
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
