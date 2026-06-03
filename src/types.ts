export type UserRole = 'admin' | 'input-only';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
}

export interface PiketRecord {
  id: string;
  nama: string;
  kelas: string;
  kategori: 'Terlambat' | 'Izin Keluar' | 'Izin Pulang' | 'Lainnya';
  jam: string;
  alasan?: string;
  timestamp: string;
  createdBy: string;
}

export type AppView = 'dashboard' | 'input' | 'records' | 'students';

export interface Student {
  id: string;
  nama: string;
  kelas: string;
  createdAt?: string;
}
