import { useEffect, useState } from 'react';
import { DEGREE_OPTIONS, DEPARTMENT_OPTIONS, DESIGNATION_OPTIONS, type FacultyRecord } from '../types';
import { db } from '../db';
import { emptyRecord, validateRecord, type FacultyErrors } from '../validation';
import { calcExperienceYears } from '../dateUtils';
import { normalizeDesignation } from '../designationUtils';
import { formatDegree, parseDegree } from '../degreeUtils';
import SelectOrOther from './SelectOrOther';

type Errors = FacultyErrors;

export default function FacultyForm({
  onSaved,
  editingRecord,
}: {
  onSaved: () => void;
  editingRecord?: FacultyRecord | null;
}) {
  const [record, setRecord] = useState<FacultyRecord>({ ...emptyRecord, ...editingRecord });
  const [errors, setErrors] = useState<Errors>({});
  const [statusMsg, setStatusMsg] = useState('');

  // Load a record into the form when an edit is requested from the register
  useEffect(() => {
    setRecord({ ...emptyRecord, ...editingRecord });
    setErrors({});
    setStatusMsg('');
  }, [editingRecord]);

  function update<K extends keyof FacultyRecord>(key: K, value: FacultyRecord[K]) {
    setRecord((r) => ({ ...r, [key]: value }));
    setStatusMsg('');
  }

  // Derived degree fields for ME / PhD / Pursuing PhD handling
  const { baseDegree, pursuingPhd: parsedPursuing } = parseDegree(record.highestDegree);
  const isPursuingPhd = record.pursuingPhd ?? parsedPursuing;
  const isMeSelected = baseDegree === 'ME';

  function handleDegreeChange(newBase: string) {
    const isMe = newBase === 'ME';
    const nextPursuing = isMe ? isPursuingPhd : false;
    const formatted = formatDegree(newBase, nextPursuing);
    setRecord((r) => ({
      ...r,
      highestDegree: formatted,
      pursuingPhd: nextPursuing,
    }));
    setStatusMsg('');
  }

  function handlePursuingChange(checked: boolean) {
    const formatted = formatDegree(baseDegree, checked);
    setRecord((r) => ({
      ...r,
      highestDegree: formatted,
      pursuingPhd: checked,
    }));
    setStatusMsg('');
  }

  // Experience is derived from the joining date, not entered by hand —
  // recompute it live whenever the date changes.
  useEffect(() => {
    setRecord((r) => ({ ...r, experienceYears: calcExperienceYears(r.dateOfJoiningInstitution) }));
  }, [record.dateOfJoiningInstitution]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const effectivePursuing = baseDegree === 'ME' ? isPursuingPhd : false;
    const rec: FacultyRecord = {
      ...record,
      panNo: record.panNo.toUpperCase(),
      highestDegree: formatDegree(baseDegree, effectivePursuing),
      pursuingPhd: effectivePursuing,
      presentDesignation: normalizeDesignation(record.presentDesignation),
      designationAtJoining: normalizeDesignation(record.designationAtJoining),
    };
    const errs = validateRecord(rec);
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
  const RequiredMark = () => <span className="required-mark">*</span>;

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
            <label htmlFor="facultyName">
              Name of the Faculty <RequiredMark />
            </label>
            <input
              id="facultyName"
              value={record.facultyName}
              onChange={(e) => update('facultyName', e.target.value)}
              placeholder="Dr. Full Name"
            />
            {err('facultyName') && <span className="error-text">{err('facultyName')}</span>}
          </div>

          <div className={`field ${err('alliedDepartment') ? 'has-error' : ''}`}>
            <label htmlFor="alliedDepartment">
              Allied Department Name <RequiredMark />
            </label>
            <SelectOrOther
              id="alliedDepartment"
              value={record.alliedDepartment}
              options={DEPARTMENT_OPTIONS}
              onChange={(v) => update('alliedDepartment', v)}
              placeholder="Type department"
              hasError={!!err('alliedDepartment')}
            />
            {err('alliedDepartment') && <span className="error-text">{err('alliedDepartment')}</span>}
          </div>

          <div className={`field ${err('panNo') ? 'has-error' : ''}`}>
            <label htmlFor="panNo">
              PAN No. <RequiredMark />
            </label>
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

          <div className={`field ${err('apaarId') ? 'has-error' : ''}`}>
            <label htmlFor="apaarId">
              APAAR Faculty ID <RequiredMark />
            </label>
            <input
              id="apaarId"
              className="mono"
              value={record.apaarId}
              onChange={(e) => update('apaarId', e.target.value)}
            />
            {err('apaarId') && <span className="error-text">{err('apaarId')}</span>}
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
            <label htmlFor="highestDegree">
              Highest Degree <RequiredMark />
            </label>
            <SelectOrOther
              id="highestDegree"
              value={baseDegree}
              options={DEGREE_OPTIONS}
              onChange={handleDegreeChange}
              placeholder="Type degree"
              hasError={!!err('highestDegree')}
            />
            {isMeSelected && (
              <label className="checkbox-field-inline">
                <input
                  type="checkbox"
                  checked={isPursuingPhd}
                  onChange={(e) => handlePursuingChange(e.target.checked)}
                />
                <span>Pursuing Ph.D.</span>
              </label>
            )}
            {err('highestDegree') && <span className="error-text">{err('highestDegree')}</span>}
          </div>

          <div className={`field ${err('university') ? 'has-error' : ''}`}>
            <label htmlFor="university">
              University <RequiredMark />
            </label>
            <input
              id="university"
              value={record.university}
              onChange={(e) => update('university', e.target.value)}
            />
            {err('university') && <span className="error-text">{err('university')}</span>}
          </div>

          <div className={`field ${err('degreeCompletionDate') ? 'has-error' : ''}`}>
            <label htmlFor="degreeCompletionDate">
              Date of Completion of Degree <span className="hint">(as per convocation)</span>{' '}
              <RequiredMark />
            </label>
            <input
              id="degreeCompletionDate"
              type="date"
              value={record.degreeCompletionDate}
              onChange={(e) => update('degreeCompletionDate', e.target.value)}
            />
            {err('degreeCompletionDate') && (
              <span className="error-text">{err('degreeCompletionDate')}</span>
            )}
          </div>

          <div className={`field field--wide ${err('specialization') ? 'has-error' : ''}`}>
            <label htmlFor="specialization">
              Area of Specialization <RequiredMark />
            </label>
            <input
              id="specialization"
              value={record.specialization}
              onChange={(e) => update('specialization', e.target.value)}
            />
            {err('specialization') && <span className="error-text">{err('specialization')}</span>}
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
            <label htmlFor="doj">
              Date of Joining in this Institution <RequiredMark />
            </label>
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
            <label htmlFor="experienceYears">
              Experience in years in current Institute{' '}
              <span className="hint">(auto-calculated from Date of Joining)</span>
            </label>
            <input
              id="experienceYears"
              className="mono"
              value={record.experienceYears ? `${record.experienceYears} yrs` : '—'}
              readOnly
              disabled
            />
          </div>

          <div className={`field ${err('designationAtJoining') ? 'has-error' : ''}`}>
            <label htmlFor="designationAtJoining">
              Designation at Time of Joining <RequiredMark />
            </label>
            <SelectOrOther
              id="designationAtJoining"
              value={record.designationAtJoining}
              options={DESIGNATION_OPTIONS}
              onChange={(v) => update('designationAtJoining', v)}
              placeholder="Type designation"
              hasError={!!err('designationAtJoining')}
            />
            {err('designationAtJoining') && (
              <span className="error-text">{err('designationAtJoining')}</span>
            )}
          </div>

          <div className={`field ${err('presentDesignation') ? 'has-error' : ''}`}>
            <label htmlFor="presentDesignation">
              Present Designation <RequiredMark />
            </label>
            <SelectOrOther
              id="presentDesignation"
              value={record.presentDesignation}
              options={DESIGNATION_OPTIONS}
              onChange={(v) => update('presentDesignation', v)}
              placeholder="Type designation"
              hasError={!!err('presentDesignation')}
            />
            {err('presentDesignation') && (
              <span className="error-text">{err('presentDesignation')}</span>
            )}
          </div>

          <div className={`field field--wide ${err('professorDesignationDate') ? 'has-error' : ''}`}>
            <label htmlFor="profDate">
              Date Designated as Professor / Associate Professor <RequiredMark />
            </label>
            <input
              id="profDate"
              type="date"
              value={record.professorDesignationDate}
              onChange={(e) => update('professorDesignationDate', e.target.value)}
            />
            {err('professorDesignationDate') && (
              <span className="error-text">{err('professorDesignationDate')}</span>
            )}
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
              {(['Regular', 'Contract / Ad hoc'] as const).map((opt) => (
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
              If contractual or ad hoc — Full time / Part time
              {record.associationNature === 'Contract / Ad hoc' && <RequiredMark />}
            </label>
            <select
              id="contractBasis"
              value={record.contractBasis}
              onChange={(e) => update('contractBasis', e.target.value as FacultyRecord['contractBasis'])}
              disabled={record.associationNature === 'Regular'}
            >
              <option value="">—</option>
              <option value="Full time">Full time</option>
              <option value="Part time">Part time</option>
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
              {record.currentlyAssociated === 'N' && <RequiredMark />}
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
