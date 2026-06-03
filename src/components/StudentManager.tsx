import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Student } from '../types';
import { cn } from '../lib/utils';
import {
  Plus,
  Trash2,
  Search,
  Users,
  Upload,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  BookOpen,
  X,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { STUDENT_NAMES, CLASSES, STUDENT_KELAS_MAP } from '../constants';

interface StudentManagerProps {
  darkMode: boolean;
}

export default function StudentManager({ darkMode }: StudentManagerProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('Semua');
  const [formData, setFormData] = useState({ nama: '', kelas: '' });
  const [adding, setAdding] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);

  // Real-time listener dari Firestore
  useEffect(() => {
    const q = query(collection(db, 'students'), orderBy('nama', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student)));
      setLoadingData(false);
    });
    return () => unsub();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Tambah siswa baru
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const nama = formData.nama.trim().toUpperCase();
    if (!nama || !formData.kelas) return;
    setAdding(true);
    try {
      await addDoc(collection(db, 'students'), {
        nama,
        kelas: formData.kelas,
        createdAt: new Date().toISOString(),
      });
      setFormData({ nama: '', kelas: '' });
      showToast(`"${nama}" berhasil ditambahkan!`, 'success');
    } catch {
      showToast('Gagal menambahkan siswa.', 'error');
    } finally {
      setAdding(false);
    }
  };

  // Hapus siswa
  const handleDelete = async (id: string, nama: string) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'students', id));
      showToast(`"${nama}" dihapus dari daftar.`, 'success');
    } catch {
      showToast('Gagal menghapus siswa.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Seed semua siswa dari Excel (constants.ts) → Firestore
  const handleSeedFromExcel = async () => {
    setShowSeedConfirm(false);
    setSeeding(true);
    try {
      const CHUNK = 499;
      let total = 0;
      for (let i = 0; i < STUDENT_NAMES.length; i += CHUNK) {
        const batch = writeBatch(db);
        const chunk = STUDENT_NAMES.slice(i, i + CHUNK);
        chunk.forEach((nama) => {
          const ref = doc(collection(db, 'students'));
          batch.set(ref, {
            nama,
            kelas: STUDENT_KELAS_MAP[nama] || '',
            createdAt: new Date().toISOString(),
          });
        });
        await batch.commit();
        total += chunk.length;
      }
      showToast(`${total} siswa berhasil diimport dari Excel!`, 'success');
    } catch {
      showToast('Gagal mengimport data. Coba lagi.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  // Filter & search
  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch = s.nama.toLowerCase().includes(search.toLowerCase());
      const matchClass = classFilter === 'Semua' || s.kelas === classFilter;
      return matchSearch && matchClass;
    });
  }, [students, search, classFilter]);

  const allClassesInFirestore = useMemo(() => {
    const set = new Set(students.map((s) => s.kelas).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);

  const isSeedNeeded = students.length === 0 && !loadingData;

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Siswa', value: students.length, icon: Users, color: 'blue' },
          { label: 'Total Kelas', value: allClassesInFirestore.length, icon: BookOpen, color: 'indigo' },
          { label: 'Hasil Pencarian', value: filtered.length, icon: GraduationCap, color: 'emerald' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={cn(
              'rounded-2xl p-5 border flex items-center gap-4',
              darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-white/20'
            )}
          >
            <div
              className={cn(
                'p-3 rounded-xl',
                stat.color === 'blue' && (darkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'),
                stat.color === 'indigo' && (darkMode ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-50 text-indigo-600'),
                stat.color === 'emerald' && (darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
              )}
            >
              <stat.icon size={22} />
            </div>
            <div>
              <p className={cn('text-xs font-semibold', darkMode ? 'text-slate-400' : 'text-gray-500')}>{stat.label}</p>
              <p className={cn('text-2xl font-black', darkMode ? 'text-white' : 'text-gray-800')}>{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form Tambah Siswa */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            'lg:col-span-2 rounded-3xl border p-6 shadow-xl h-fit',
            darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-white/20'
          )}
        >
          <h3 className={cn('text-lg font-black mb-5 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-800')}>
            <Plus size={20} className="text-blue-500" />
            Tambah Siswa Baru
          </h3>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <label className={cn('text-xs font-bold uppercase tracking-wider', darkMode ? 'text-slate-400' : 'text-gray-500')}>
                Nama Lengkap
              </label>
              <input
                required
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                placeholder="Contoh: BAMBANG SUNARTO"
                className={cn(
                  'w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium',
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500'
                    : 'bg-gray-50 border-gray-200 text-gray-800'
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label className={cn('text-xs font-bold uppercase tracking-wider', darkMode ? 'text-slate-400' : 'text-gray-500')}>
                Kelas
              </label>
              <select
                required
                value={formData.kelas}
                onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                className={cn(
                  'w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium',
                  darkMode
                    ? 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-800'
                )}
              >
                <option value="">Pilih Kelas</option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={adding || !formData.nama.trim() || !formData.kelas}
              className={cn(
                'w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg',
                adding || !formData.nama.trim() || !formData.kelas
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95'
              )}
            >
              {adding ? (
                <><RefreshCw size={16} className="animate-spin" /> Menyimpan...</>
              ) : (
                <><Plus size={16} /> Tambah Siswa</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className={cn('my-6 border-t', darkMode ? 'border-slate-700' : 'border-gray-100')} />

          {/* Seed dari Excel */}
          <div>
            <p className={cn('text-xs font-semibold mb-3', darkMode ? 'text-slate-400' : 'text-gray-500')}>
              IMPORT MASSAL
            </p>
            {isSeedNeeded && (
              <div className={cn('mb-3 p-3 rounded-xl text-xs font-medium border', darkMode ? 'bg-amber-900/30 border-amber-700 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700')}>
                ⚠️ Daftar siswa masih kosong. Gunakan tombol di bawah untuk import data dari Excel.
              </div>
            )}
            <button
              onClick={() => setShowSeedConfirm(true)}
              disabled={seeding}
              className={cn(
                'w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border text-sm',
                seeding
                  ? 'opacity-50 cursor-not-allowed'
                  : darkMode
                    ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              )}
            >
              {seeding ? (
                <><RefreshCw size={16} className="animate-spin" /> Mengimport...</>
              ) : (
                <><Upload size={16} /> Import {STUDENT_NAMES.length} Siswa dari Excel</>
              )}
            </button>
            <p className={cn('text-[10px] mt-2 text-center', darkMode ? 'text-slate-500' : 'text-gray-400')}>
              Import data dari file Excel yang sudah diproses sebelumnya.
              <br />Pastikan belum pernah diimport agar tidak ada duplikasi.
            </p>
          </div>
        </motion.div>

        {/* Daftar Siswa */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            'lg:col-span-3 rounded-3xl border shadow-xl overflow-hidden',
            darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-white/20'
          )}
        >
          {/* Search & Filter */}
          <div className={cn('p-4 border-b flex flex-col sm:flex-row gap-3', darkMode ? 'border-slate-700' : 'border-gray-100')}>
            <div className="relative flex-1">
              <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2', darkMode ? 'text-slate-500' : 'text-gray-400')} size={16} />
              <input
                type="text"
                placeholder="Cari nama siswa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  'w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all',
                  darkMode ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500' : 'bg-gray-50 border-gray-200 text-gray-800'
                )}
              />
            </div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className={cn(
                'px-3 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all',
                darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
              )}
            >
              <option value="Semua">Semua Kelas</option>
              {allClassesInFirestore.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[520px]">
            {loadingData ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <RefreshCw className="animate-spin text-blue-500" size={28} />
                <p className={cn('text-sm font-medium', darkMode ? 'text-slate-400' : 'text-gray-500')}>Memuat data siswa...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <GraduationCap className={cn('mx-auto mb-3', darkMode ? 'text-slate-600' : 'text-gray-300')} size={40} />
                <p className={cn('text-sm italic', darkMode ? 'text-slate-500' : 'text-gray-400')}>
                  {students.length === 0 ? 'Belum ada data siswa. Silakan import terlebih dahulu.' : 'Tidak ada siswa ditemukan.'}
                </p>
              </div>
            ) : (
              <div className={cn('divide-y', darkMode ? 'divide-slate-700/60' : 'divide-gray-50')}>
                {filtered.map((student, idx) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                    className={cn(
                      'flex items-center justify-between px-5 py-3.5 group transition-colors',
                      darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-blue-50/60'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0',
                        darkMode ? 'bg-slate-700 text-blue-400' : 'bg-blue-100 text-blue-600'
                      )}>
                        {student.nama.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className={cn('text-sm font-bold truncate', darkMode ? 'text-white' : 'text-gray-800')}>
                          {student.nama}
                        </p>
                        <p className={cn('text-xs', darkMode ? 'text-slate-400' : 'text-gray-400')}>
                          {student.kelas || <span className="italic">Kelas tidak diketahui</span>}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(student.id, student.nama)}
                      disabled={deletingId === student.id}
                      className={cn(
                        'opacity-0 group-hover:opacity-100 p-2 rounded-xl transition-all flex-shrink-0',
                        darkMode ? 'hover:bg-rose-500/20 text-rose-400' : 'hover:bg-rose-50 text-rose-500'
                      )}
                    >
                      {deletingId === student.id ? (
                        <RefreshCw size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {filtered.length > 0 && (
            <div className={cn('px-5 py-3 border-t text-xs font-medium', darkMode ? 'border-slate-700 text-slate-500' : 'border-gray-100 text-gray-400')}>
              Menampilkan {filtered.length} dari {students.length} siswa
            </div>
          )}
        </motion.div>
      </div>

      {/* Seed Confirm Modal */}
      <AnimatePresence>
        {showSeedConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSeedConfirm(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              className={cn(
                'relative w-full max-w-sm rounded-3xl p-8 shadow-2xl',
                darkMode ? 'bg-slate-800' : 'bg-white'
              )}
            >
              <button
                onClick={() => setShowSeedConfirm(false)}
                className={cn('absolute top-4 right-4 p-1.5 rounded-full', darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400')}
              >
                <X size={16} />
              </button>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                  <Upload size={28} className="text-amber-500" />
                </div>
                <h3 className={cn('text-xl font-black', darkMode ? 'text-white' : 'text-gray-800')}>Konfirmasi Import</h3>
                <p className={cn('text-sm mt-2', darkMode ? 'text-slate-400' : 'text-gray-500')}>
                  Akan menambahkan <strong>{STUDENT_NAMES.length} siswa</strong> dari data Excel ke Firestore.
                </p>
                <p className={cn('text-xs mt-2 p-3 rounded-xl', darkMode ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-50 text-rose-600')}>
                  ⚠️ Pastikan belum pernah diimport sebelumnya untuk menghindari data ganda!
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSeedConfirm(false)}
                  className={cn('flex-1 py-3 rounded-xl font-bold text-sm transition-all', darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
                >
                  Batal
                </button>
                <button
                  onClick={handleSeedFromExcel}
                  className="flex-[2] py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
                >
                  Ya, Import Sekarang
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              'fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-white z-50',
              toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
