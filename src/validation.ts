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
  if (!rec.panNo.trim()) {
    errs.panNo = 'Required';
  } else if (!PAN_REGEX.test(rec.panNo.toUpperCase())) {
    errs.panNo = 'Format: AAAAA9999A';
  }
  if (!rec.apaarId.trim()) errs.apaarId = 'Required';
  if (!rec.highestDegree.trim()) errs.highestDegree = 'Required';
  if (!rec.university.trim()) errs.university = 'Required';
  if (!rec.specialization.trim()) errs.specialization = 'Required';
  if (!rec.degreeCompletionDate) errs.degreeCompletionDate = 'Required';
  if (!rec.dateOfJoiningInstitution) errs.dateOfJoiningInstitution = 'Required';
  if (!rec.designationAtJoining.trim()) errs.designationAtJoining = 'Required';
  if (!rec.presentDesignation.trim()) errs.presentDesignation = 'Required';
  if (!rec.professorDesignationDate) errs.professorDesignationDate = 'Required';
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
