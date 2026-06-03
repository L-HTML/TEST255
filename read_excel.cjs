const XLSX = require('xlsx');

try {
  const wb = XLSX.readFile('Daftar Siswa X Gasal 2025-2026_F.xlsx');
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  console.log('Total rows:', rows.length);
  console.log('First 10 rows:');
  rows.slice(0, 10).forEach((row, i) => {
    console.log(`Row ${i + 1}:`, JSON.stringify(row));
  });
} catch (e) {
  console.error(e);
}
