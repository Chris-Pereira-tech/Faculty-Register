import { useEffect, useState } from 'react';
import type { FacultyRecord } from '../types';
import { db } from '../db';
import { emptyRecord, validateRecord, type FacultyErrors } from '../validation';

type Errors = FacultyErrors;

export default function FacultyForm({
  onSaved,
  editingRecord,
}: {
  onSaved: () => void;
  editingRecord?: FacultyRecord | null;
}) {
  const [record, setRecord] = useState<FacultyRecord>(editingRecord ?? emptyRecord);
  const [errors, setErrors] = useState<Errors>({});
  const [statusMsg, setStatusMsg] = useState('');

  // Load a record into the form when an edit is requested from the register
  useEffect(() => {
    setRecord(editingRecord ?? emptyRecord);
    setErrors({});
    setStatusMsg('');
  }, [editingRecord]);

  function update<K extends keyof FacultyRecord>(key: K, value: FacultyRecord[K]) {
    setRecord((r) => ({ ...r, [key]: value }));
    setStatusMsg('');
  }

  function validate(rec: FacultyRecord): Errors {
    return validateRecord(rec);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rec: FacultyRecord = { ...record, panNo: record.panNo.toUpperCase() };
    const errs = validate(rec);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setStatusMsg('');
      return;
    }
    if (rec.id != null) {
      await db.faculty.put(rec);
      setStatusMsg(`Updated — changes to ${rec.facultyName} saved.`);
    } else {
      await db.faculty.add(rec);
      setStatusMsg(`Saved — ${rec.facultyName} added to the register.`);
    }
    setRecord(emptyRecord);
    onSaved();
  }

  const err = (key: keyof FacultyRecord) => errors[key];

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      {/* Section 1 — Identity */}
      <div className="form-section">
        <div className="form-section__heading">
          <span className="form-section__number">01</span>
          <h3 className="form-section__title">Identity</h3>
        </div>
        <div className="field-grid">
          <div className={`field ${err('facultyName') ? 'has-error' : ''}`}>
            <label htmlFor="facultyName">Name of the Faculty</label>
            <input
              id="facultyName"
              value={record.facultyName}
              onChange={(e) => update('facultyName', e.target.value)}
              placeholder="Dr. Full Name"
            />
            {err('facultyName') && <span className="error-text">{err('facultyName')}</span>}
          </div>

          <div className={`field ${err('alliedDepartment') ? 'has-error' : ''}`}>
            <label htmlFor="alliedDepartment">Allied Department Name</label>
            <input
              id="alliedDepartment"
              value={record.alliedDepartment}
              onChange={(e) => update('alliedDepartment', e.target.value)}
              placeholder="e.g. Computer Engineering"
            />
            {err('alliedDepartment') && <span className="error-text">{err('alliedDepartment')}</span>}
          </div>

          <div className={`field ${err('panNo') ? 'has-error' : ''}`}>
            <label htmlFor="panNo">PAN No.</label>
            <input
              id="panNo"
              className="mono"
              value={record.panNo}
              onChange={(e) => update('panNo', e.target.value.toUpperCase())}
              placeholder="AAAAA9999A"
              maxLength={10}
            />
            {err('panNo') && <span className="error-text">{err('panNo')}</span>}
          </div>

          <div className="field">
            <label htmlFor="apaarId">
              APAAR Faculty ID <span className="hint">(if any)</span>
            </label>
            <input
              id="apaarId"
              className="mono"
              value={record.apaarId}
              onChange={(e) => update('apaarId', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Section 2 — Academic background */}
      <div className="form-section">
        <div className="form-section__heading">
          <span className="form-section__number">02</span>
          <h3 className="form-section__title">Academic background</h3>
        </div>
        <div className="field-grid">
          <div className={`field ${err('highestDegree') ? 'has-error' : ''}`}>
            <label htmlFor="highestDegree">Highest Degree</label>
            <input
              id="highestDegree"
              value={record.highestDegree}
              onChange={(e) => update('highestDegree', e.target.value)}
              placeholder="e.g. Ph.D."
            />
            {err('highestDegree') && <span className="error-text">{err('highestDegree')}</span>}
          </div>

          <div className="field">
            <label htmlFor="university">University</label>
            <input
              id="university"
              value={record.university}
              onChange={(e) => update('university', e.target.value)}
            />
          </div>

          <div className="field field--wide">
            <label htmlFor="specialization">Area of Specialization</label>
            <input
              id="specialization"
              value={record.specialization}
              onChange={(e) => update('specialization', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Section 3 — Employment at this institution */}
      <div className="form-section">
        <div className="form-section__heading">
          <span className="form-section__number">03</span>
          <h3 className="form-section__title">Employment at this institution</h3>
        </div>
        <div className="field-grid">
          <div className={`field ${err('dateOfJoiningInstitution') ? 'has-error' : ''}`}>
            <label htmlFor="doj">Date of Joining in this Institution</label>
            <input
              id="doj"
              type="date"
              value={record.dateOfJoiningInstitution}
              onChange={(e) => update('dateOfJoiningInstitution', e.target.value)}
            />
            {err('dateOfJoiningInstitution') && (
              <span className="error-text">{err('dateOfJoiningInstitution')}</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="experienceYears">Experience in years in current Institute</label>
            <input
              id="experienceYears"
              type="number"
              min={0}
              step={0.5}
              value={record.experienceYears}
              onChange={(e) => update('experienceYears', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="designationAtJoining">Designation at Time of Joining</label>
            <input
              id="designationAtJoining"
              value={record.designationAtJoining}
              onChange={(e) => update('designationAtJoining', e.target.value)}
            />
          </div>

          <div className={`field ${err('presentDesignation') ? 'has-error' : ''}`}>
            <label htmlFor="presentDesignation">Present Designation</label>
            <input
              id="presentDesignation"
              value={record.presentDesignation}
              onChange={(e) => update('presentDesignation', e.target.value)}
            />
            {err('presentDesignation') && (
              <span className="error-text">{err('presentDesignation')}</span>
            )}
          </div>

          <div className="field field--wide">
            <label htmlFor="profDate">
              Date Designated as Professor / Associate Professor <span className="hint">(if any)</span>
            </label>
            <input
              id="profDate"
              type="date"
              value={record.professorDesignationDate}
              onChange={(e) => update('professorDesignationDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Section 4 — Association status */}
      <div className="form-section">
        <div className="form-section__heading">
          <span className="form-section__number">04</span>
          <h3 className="form-section__title">Association status</h3>
        </div>
        <div className="field-grid">
          <div className="field">
            <label>Nature of Association</label>
            <div className="radio-row">
              {(['Regular', 'Contract', 'Ad hoc'] as const).map((opt) => (
                <label key={opt}>
                  <input
                    type="radio"
                    name="associationNature"
                    checked={record.associationNature === opt}
                    onChange={() => update('associationNature', opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div className={`field ${err('contractBasis') ? 'has-error' : ''}`}>
            <label htmlFor="contractBasis">
              If contractual — Full time / Part time / Hourly based
            </label>
            <select
              id="contractBasis"
              value={record.contractBasis}
              onChange={(e) => update('contractBasis', e.target.value as FacultyRecord['contractBasis'])}
              disabled={record.associationNature !== 'Contract'}
            >
              <option value="">—</option>
              <option value="Full time">Full time</option>
              <option value="Part time">Part time</option>
              <option value="Hourly based">Hourly based</option>
            </select>
            {err('contractBasis') && <span className="error-text">{err('contractBasis')}</span>}
          </div>

          <div className="field">
            <label>Currently Associated</label>
            <div className="radio-row">
              {(['Y', 'N'] as const).map((opt) => (
                <label key={opt}>
                  <input
                    type="radio"
                    name="currentlyAssociated"
                    checked={record.currentlyAssociated === opt}
                    onChange={() => update('currentlyAssociated', opt)}
                  />
                  {opt === 'Y' ? 'Yes' : 'No'}
                </label>
              ))}
            </div>
          </div>

          <div className={`field ${err('dateOfLeaving') ? 'has-error' : ''}`}>
            <label htmlFor="dateOfLeaving">
              Date of Leaving <span className="hint">(if not currently associated)</span>
            </label>
            <input
              id="dateOfLeaving"
              type="date"
              value={record.dateOfLeaving}
              onChange={(e) => update('dateOfLeaving', e.target.value)}
              disabled={record.currentlyAssociated !== 'N'}
            />
            {err('dateOfLeaving') && <span className="error-text">{err('dateOfLeaving')}</span>}
          </div>
        </div>
      </div>

      <div className="form-actions">
        <span className="status-msg">{statusMsg}</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setRecord(emptyRecord);
              setErrors({});
              setStatusMsg('');
            }}
          >
            Clear form
          </button>
          <button type="submit" className="btn">
            {record.id != null ? 'Update record' : 'Save to register'}
          </button>
        </div>
      </div>
    </form>
  );
}
