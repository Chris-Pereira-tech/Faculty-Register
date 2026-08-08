import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import './App.css';
import { db } from './db';
import type { FacultyRecord } from './types';
import FacultyForm from './components/FacultyForm';
import FacultyTable from './components/FacultyTable';
import ImportPanel from './components/ImportPanel';

type Tab = 'add' | 'register' | 'import';

function App() {
  const [tab, setTab] = useState<Tab>('add');
  const [editingRecord, setEditingRecord] = useState<FacultyRecord | null>(null);
  const records = useLiveQuery(() => db.faculty.toArray(), []) ?? [];

  function handleEdit(rec: FacultyRecord) {
    setEditingRecord(rec);
    setTab('add');
  }

  function handleSaved() {
    setEditingRecord(null);
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
            Records on file
            <strong>{records.length}</strong>
          </div>
        </div>
        <nav className="tabs">
          <button
            className={tab === 'add' ? 'active' : ''}
            onClick={() => {
              setTab('add');
            }}
          >
            {editingRecord ? 'Edit record' : 'Add record'}
          </button>
          <button
            className={tab === 'register' ? 'active' : ''}
            onClick={() => {
              setEditingRecord(null);
              setTab('register');
            }}
          >
            View register
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

      <main className="main">
        {tab === 'add' && <FacultyForm onSaved={handleSaved} editingRecord={editingRecord} />}
        {tab === 'register' && <FacultyTable records={records} onEdit={handleEdit} />}
        {tab === 'import' && <ImportPanel onImported={() => setTab('register')} />}
      </main>
    </div>
  );
}

export default App;
