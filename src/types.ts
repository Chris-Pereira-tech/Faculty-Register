export type AssociationNature = 'Regular' | 'Contract' | 'Ad hoc';
export type ContractBasis = 'Full time' | 'Part time' | 'Hourly based' | '';
export type YesNo = 'Y' | 'N';

export interface FacultyRecord {
  id?: number; // Dexie auto-increment primary key
  alliedDepartment: string;
  facultyName: string;
  panNo: string;
  apaarId: string;
  highestDegree: string;
  university: string;
  specialization: string;
  dateOfJoiningInstitution: string; // ISO date string
  experienceYears: string;
  designationAtJoining: string;
  presentDesignation: string;
  professorDesignationDate: string; // ISO date string, optional
  associationNature: AssociationNature;
  contractBasis: ContractBasis;
  currentlyAssociated: YesNo;
  dateOfLeaving: string; // ISO date string, only if currentlyAssociated === 'N'
}

export const FACULTY_COLUMNS: { key: keyof FacultyRecord; label: string }[] = [
  { key: 'alliedDepartment', label: 'Allied Department Name' },
  { key: 'facultyName', label: 'Name of the Faculty' },
  { key: 'panNo', label: 'PAN No.' },
  { key: 'apaarId', label: 'APAAR Faculty ID (if any)' },
  { key: 'highestDegree', label: 'Highest Degree' },
  { key: 'university', label: 'University' },
  { key: 'specialization', label: 'Area of Specialization' },
  { key: 'dateOfJoiningInstitution', label: 'Date of Joining in this Institution' },
  { key: 'experienceYears', label: 'Experience in years in current Institute' },
  { key: 'designationAtJoining', label: 'Designation at Time of Joining in this Institution' },
  { key: 'presentDesignation', label: 'Present Designation' },
  { key: 'professorDesignationDate', label: 'The date on which Designated as Professor / Associate Professor if any' },
  { key: 'associationNature', label: 'Nature of Association (Regular / Contract / Ad hoc)' },
  { key: 'contractBasis', label: 'If contractual mention Full time or Part time / hourly based' },
  { key: 'currentlyAssociated', label: 'Currently Associated (Y/N)' },
  { key: 'dateOfLeaving', label: 'Date of Leaving if any (In case Currently Associated is No)' },
];
