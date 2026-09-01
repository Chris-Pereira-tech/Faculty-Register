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
  Employment / Association status). Nearly every field is required — shown
  with a red border and message if the form is submitted incomplete — with
  two exceptions that stay conditional: "If contractual or ad hoc — basis"
  is only required when Nature of Association is Contract / Ad hoc, and
  "Date of Leaving" is only required when Currently Associated is No.
  Allied Department, Highest Degree, and both Designation fields are
  dropdowns (Department: Computer Engineering / Computer Science
  Engineering / Electronics and Computer Science / Mechanical) with an
  "Other" option for anything not listed. Experience in years is
  auto-calculated from the Date of Joining, not entered by hand. Nature of
  Association is now just Regular or Contract / Ad hoc (merged into one
  option) everywhere in the app — the form, the register's filter and
  badges, and Excel import. Includes a "Date of Completion of Degree (as
  per Convocation)" field.
- **View register** — wider layout than the form (up to 1900px, centered,
  scaling with the browser window) so the table doesn't need side-scrolling
  on typical desktop widths. The Degree/University and Present Designation
  columns wrap onto multiple lines instead of forcing the table wider, since
  those two tend to hold the longest text. A searchable, sortable,
  filterable table of everyone entered. Filter by association nature
  (Regular / Contract / Ad hoc), active status, department, or present
  designation independently. The department filter groups raw values like
  "CE-1", "CE 2", or "CSE" under the four canonical department names
  automatically, so the dropdown always shows just the four rather than
  every short-form variant that's ever been entered or imported — the
  underlying stored value for each record is left untouched, only the
  filter grouping is normalized. Drag column headers to reorder them
  (remembered on this device, with a "Reset column order" button). Edit or
  delete any row, or select multiple rows with the checkboxes for bulk
  delete.
- **Import from Excel** — drag and drop (or browse to) an `.xlsx`/`.xls` file.
  Column headers are matched against the register's field names (exports from
  this app match automatically; close variants like "Department" or "PAN"
  are recognized too). You get a preview of every parsed row with validation
  status before anything is saved — only rows you check get imported, so bad
  rows can be fixed in the source file and re-uploaded without blocking the
  rest.
- **Export to Excel** — button in the register exports the currently
  filtered/visible rows to a `.xlsx` file with the exact same column headers
  and order as the source table, ready to paste into the institutional
  submission format.

## Login / password gate

The app is behind a simple password screen (default password: `faculty2026`).
It stays unlocked for the rest of that browser tab's session (closing the tab
or browser locks it again), or you can click **Lock** in the top-right at any
time to lock it manually.

**Change the password before sharing this app.** Generate a new hash and
paste it into `src/auth.ts`:

```bash
node scripts/hash-password.mjs "your-new-password"
```

Copy the printed hash into the `PASSWORD_HASH` constant near the top of
`src/auth.ts`, then rebuild.

**Important limitation:** this is a client-side-only app with no server, so
this gate is a deterrent, not real security. Because the check runs entirely
in the browser, anyone with dev-tools access can read the password hash from
the page, brute-force it offline, or bypass the check outright — it stops a
casual look at a shared or unattended device, but it does not protect the
data from a determined user with access to the device or the source code. If
you need to genuinely restrict access (e.g. this data is sensitive and
multiple people share the device, or the site is hosted publicly), you'd want
a real backend with server-side authentication instead — happy to help with
that if it becomes necessary.

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
