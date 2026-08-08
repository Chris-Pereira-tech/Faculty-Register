import Dexie, { type Table } from 'dexie';
import type { FacultyRecord } from './types';

export class FacultyDatabase extends Dexie {
  faculty!: Table<FacultyRecord, number>;

  constructor() {
    super('FacultyRegisterDB');
    this.version(1).stores({
      // ++id = auto-increment primary key; other fields indexed for search/filter
      faculty: '++id, alliedDepartment, facultyName, panNo, associationNature, currentlyAssociated',
    });
  }
}

export const db = new FacultyDatabase();
