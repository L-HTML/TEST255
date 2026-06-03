const XLSX = require('xlsx');
const fs = require('fs');

const students = [];
const classesSet = new Set();
const kelasMap = {};

// ── File 1: Kelas X ──────────────────────────────────────────────
try {
  const wbX = XLSX.readFile('Daftar Siswa X Gasal 2025-2026_F.xlsx');
  const wsX = wbX.Sheets[wbX.SheetNames[0]];
  const rowsX = XLSX.utils.sheet_to_json(wsX, { header: 1 });

  for (let i = 5; i < rowsX.length; i++) {
    const row = rowsX[i];
    const kelas = row[1];
    const nama = row[4];
    if (kelas && nama && String(nama).trim().length > 1) {
      const cleanNama = String(nama).trim();
      const cleanKelas = String(kelas).trim();
      students.push(cleanNama);
      classesSet.add(cleanKelas);
      kelasMap[cleanNama] = cleanKelas;
    }
  }
  console.log(`[X] ${students.length} siswa dari Kelas X`);
} catch (e) {
  console.error('Gagal baca file Kelas X:', e.message);
}

// ── File 2: Kelas XI ─────────────────────────────────────────────
const countBefore = students.length;
try {
  const wbXI = XLSX.readFile('Daftar_Siswa_Kelas_XI_Ringkas_baru.xlsx');
  const wsXI = wbXI.Sheets[wbXI.SheetNames[0]];
  const rowsXI = XLSX.utils.sheet_to_json(wsXI, { header: 1 });

  // Baris 0: judul, Baris 1: header => data mulai baris 2
  for (let i = 2; i < rowsXI.length; i++) {
    const row = rowsXI[i];
    const kelas = row[0];
    const nama = row[3];
    if (kelas && nama && String(nama).trim().length > 1) {
      const cleanNama = String(nama).trim();
      const cleanKelas = String(kelas).trim();
      // Hindari duplikat
      if (!kelasMap[cleanNama]) {
        students.push(cleanNama);
        kelasMap[cleanNama] = cleanKelas;
      }
      classesSet.add(cleanKelas);
    }
  }
  console.log(`[XI] ${students.length - countBefore} siswa dari Kelas XI`);
} catch (e) {
  console.error('Gagal baca file Kelas XI:', e.message);
}

// ── Sort & Generate ───────────────────────────────────────────────
const sortedClasses = Array.from(classesSet).sort();
students.sort();

const fileContent = `// File ini di-generate otomatis dari Excel (Kelas X + Kelas XI)

export const CATEGORIES = [
  'Terlambat',
  'Izin Keluar',
  'Izin Pulang',
  'Lainnya'
] as const;

export const CLASSES = ${JSON.stringify(sortedClasses, null, 2)};

export const STUDENT_NAMES = ${JSON.stringify(students, null, 2)};

export const STUDENT_KELAS_MAP: Record<string, string> = ${JSON.stringify(kelasMap, null, 2)};
`;

fs.writeFileSync('src/constants.ts', fileContent);
console.log(`\n✅ constants.ts diperbarui: ${students.length} siswa, ${sortedClasses.length} kelas.`);
console.log('Kelas:', sortedClasses.join(', '));
