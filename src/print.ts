import type { FacultyRecord } from './types';

export interface PrintColumn {
  label: string;
  value: (rec: FacultyRecord) => string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printRecords(records: FacultyRecord[], columns: PrintColumn[], title = 'Faculty Register') {
  const printWindow = window.open('', '_blank', 'width=1100,height=750');
  if (!printWindow) {
    alert('Please allow pop-ups for this site to print.');
    return;
  }

  const headHtml = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const rowsHtml = records
    .map((rec) => `<tr>${columns.map((c) => `<td>${escapeHtml(c.value(rec))}</td>`).join('')}</tr>`)
    .join('');

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #14213d;
    padding: 28px;
    margin: 0;
  }
  h1 {
    font-size: 20px;
    margin: 0 0 4px;
  }
  .meta {
    font-size: 13px;
    color: #666;
    margin-bottom: 18px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  th, td {
    border: 1px solid #ccc;
    padding: 7px 10px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #f1eee4;
    text-transform: uppercase;
    font-size: 11.5px;
    letter-spacing: 0.03em;
  }
  tbody tr:nth-child(even) {
    background: #faf9f5;
  }
  @media print {
    body { padding: 0; }
    @page { size: landscape; margin: 14mm; }
  }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${records.length} record${records.length === 1 ? '' : 's'} &middot; Printed ${escapeHtml(
    new Date().toLocaleString()
  )}</div>
  <table>
    <thead><tr>${headHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}
