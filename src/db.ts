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

import { normalizeDesignation } from './designationUtils';
import { formatDegree, parseDegree } from './degreeUtils';

export async function sanitizeFacultyDatabase(): Promise<void> {
  try {
    const records = await db.faculty.toArray();
    const updates: FacultyRecord[] = [];
    for (const rec of records) {
      let changed = false;
      const updated = { ...rec };

      const normPresent = normalizeDesignation(rec.presentDesignation);
      if (normPresent && normPresent !== rec.presentDesignation) {
        updated.presentDesignation = normPresent;
        changed = true;
      }

      const normJoining = normalizeDesignation(rec.designationAtJoining);
      if (normJoining && normJoining !== rec.designationAtJoining) {
        updated.designationAtJoining = normJoining;
        changed = true;
      }

      const { baseDegree, pursuingPhd } = parseDegree(rec.highestDegree);
      const isPursuing = rec.pursuingPhd ?? pursuingPhd;
      const formattedDeg = formatDegree(baseDegree, isPursuing);
      if (formattedDeg && formattedDeg !== rec.highestDegree) {
        updated.highestDegree = formattedDeg;
        changed = true;
      }
      if (isPursuing && rec.pursuingPhd !== true) {
        updated.pursuingPhd = true;
        changed = true;
      }

      if (changed) {
        updates.push(updated);
      }
    }
    if (updates.length > 0) {
      await db.faculty.bulkPut(updates);
    }
  } catch (err) {
    console.error('Failed to sanitize faculty database:', err);
  }
}

