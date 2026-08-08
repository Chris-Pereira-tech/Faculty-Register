# Faculty Register

A local web app for entering faculty details and exporting them to Excel in the
same 16-column format as the source institutional table (Allied Department,
Name, PAN, APAAR ID, Degree, University, Specialization, Joining Date,
Experience, Designations, Association Nature, Contract Basis, Current Status,
Leaving Date).

## Setup

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

## How it works

- **Add record** — a sectioned form (Identity / Academic background /
  Employment / Association status) with validation (PAN format, required
  fields, conditional fields like "Date of Leaving" only required when
  "Currently Associated" is No).
- **View register** — a searchable, sortable, filterable table of everyone
  entered. Edit or delete any row from here.
- **Export to Excel** — button in the register exports the currently
  filtered/visible rows to a `.xlsx` file with the exact same column headers
  and order as the source table, ready to paste into the institutional
  submission format.

## Data storage

All data is stored locally in your browser via IndexedDB (through Dexie.js) —
there's no server and no account. This means:

- Data persists across browser sessions on the same device/browser.
- Data does **not** sync across devices or browsers. If several people need to
  contribute to the same register, export to Excel and merge, or ask about
  adding a shared backend later.
- Clearing your browser's site data for this app will erase the records.

## Deploying (optional)

Since there's no backend, this builds to static files and can be hosted
anywhere static sites are hosted (e.g. GitHub Pages, same as your portfolio):

```bash
npm run build
```

This produces a `dist/` folder you can deploy directly.

## Tech stack

React + TypeScript + Vite · Dexie.js (IndexedDB) · SheetJS (`xlsx`) for export
