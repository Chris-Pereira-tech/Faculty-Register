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
};

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export type FacultyErrors = Partial<Record<keyof FacultyRecord, string>>;

export function validateRecord(rec: FacultyRecord): FacultyErrors {
  const errs: FacultyErrors = {};
  if (!rec.facultyName.trim()) errs.facultyName = 'Required';
  if (!rec.alliedDepartment.trim()) errs.alliedDepartment = 'Required';
  if (rec.panNo && !PAN_REGEX.test(rec.panNo.toUpperCase())) {
    errs.panNo = 'Format: AAAAA9999A';
  }
  if (!rec.highestDegree.trim()) errs.highestDegree = 'Required';
  if (!rec.dateOfJoiningInstitution) errs.dateOfJoiningInstitution = 'Required';
  if (!rec.presentDesignation.trim()) errs.presentDesignation = 'Required';
  // Contract and Ad hoc staff are both non-regular, so both need the
  // full/part/hourly basis specified.
  if ((rec.associationNature === 'Contract' || rec.associationNature === 'Ad hoc') && !rec.contractBasis) {
    errs.contractBasis = 'Required for contract / ad hoc staff';
  }
  if (rec.currentlyAssociated === 'N' && !rec.dateOfLeaving) {
    errs.dateOfLeaving = 'Required when not currently associated';
  }
  return errs;
}
