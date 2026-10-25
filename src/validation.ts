import type { FacultyRecord } from './types';

export const emptyRecord: FacultyRecord = {
  alliedDepartment: '',
  facultyName: '',
  panNo: '',
  apaarId: '',
  highestDegree: '',
  university: '',
  specialization: '',
  degreeCompletionDate: '',
  dateOfJoiningInstitution: '',
  experienceYears: '',
  designationAtJoining: '',
  presentDesignation: '',
  professorDesignationDate: '',
  associationNature: 'Regular',
  contractBasis: '',
  currentlyAssociated: 'Y',
  dateOfLeaving: '',
  pursuingPhd: false,
};

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export type FacultyErrors = Partial<Record<keyof FacultyRecord, string>>;

export function validateRecord(rec: FacultyRecord): FacultyErrors {
  const errs: FacultyErrors = {};
  if (!rec.facultyName.trim()) errs.facultyName = 'Required';
  if (!rec.alliedDepartment.trim()) errs.alliedDepartment = 'Required';
  if (rec.panNo.trim() && !PAN_REGEX.test(rec.panNo.toUpperCase())) {
    errs.panNo = 'Format: AAAAA9999A';
  }
  // Contract / Ad hoc staff need the full/part/hourly basis specified;
  // Regular staff don't have one.
  if (rec.associationNature === 'Contract / Ad hoc' && !rec.contractBasis) {
    errs.contractBasis = 'Required for contract / ad hoc staff';
  }
  if (rec.currentlyAssociated === 'N' && !rec.dateOfLeaving) {
    errs.dateOfLeaving = 'Required when not currently associated';
  }
  return errs;
}

export function validateImportRecord(rec: FacultyRecord): FacultyErrors {
  const errs: FacultyErrors = {};
  // For imports, columns may be missing. Any row with available data is imported.
  // We only note if identifying fields (name, department, designation) are completely missing.
  if (!rec.facultyName.trim() && !rec.alliedDepartment.trim() && !rec.presentDesignation.trim()) {
    errs.facultyName = 'No name, department, or designation';
  }
  return errs;
}
