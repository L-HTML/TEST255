import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { cn } from '../lib/utils';
import { CheckCircle2, AlertCircle, Search, Users, Clock, AlarmClock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { STUDENT_NAMES, CLASSES, CATEGORIES, STUDENT_KELAS_MAP } from '../constants';
import { Student } from '../types';

interface InputFormProps {
  darkMode: boolean;
}

const getCurrentTime = () =>
  new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/[.:]/g, ':').slice(0, 5);

export default function InputForm({ darkMode }: InputFormProps) {
  const [timeMode, setTimeMode] = useState<'auto' | 'manual'>('auto');
  const [formData, setFormData] = useState({
    nama: '',
    kelas: '',
    kategori: 'Terlambat',
    jam: getCurrentTime(),
    alasan: ''
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const autoClockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [liveTime, setLiveTime] = useState(getCurrentTime());

  // Data siswa dari Firestore (real-time), fallback ke constants jika kosong
  const [studentNames, setStudentNames] = useState<string[]>(STUDENT_NAMES);
  const [studentKelasMap, setStudentKelasMap] = useState<Record<string, string>>(STUDENT_KELAS_MAP);

  // Live clock for auto mode
  useEffect(() => {
    if (timeMode === 'auto') {
      const tick = () => {
        const t = getCurrentTime();
        setLiveTime(t);
        setFormData(prev => ({ ...prev, jam: t }));
      };
      tick();
      autoClockRef.current = setInterval(tick, 1000);
    } else {
      if (autoClockRef.current) clearInterval(autoClockRef.current);
    }
    return () => { if (autoClockRef.current) clearInterval(autoClockRef.current); };
  }, [timeMode]);

  useEffect(() => {
    const q = query(collection(db, 'students'), orderBy('nama', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) return; // pakai constants jika Firestore masih kosong
      const names: string[] = [];
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        names.push(data.nama);
        if (data.kelas) map[data.nama] = data.kelas;
      });
      setStudentNames(names);
      setStudentKelasMap(map);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (formData.nama.length > 0) {
      const searchLower = formData.nama.toLowerCase();
      const filtered = studentNames.filter(name =>
        name.toLowerCase().includes(searchLower)
      ).sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(searchLower);
        const bStarts = b.toLowerCase().startsWith(searchLower);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      });
      setSuggestions(filtered.slice(0, 50));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [formData.nama, studentNames]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'records'), {
        ...formData,
        timestamp: new Date().toISOString(),
        createdBy: auth.currentUser.uid
      });
      
      setToast({ message: 'Data berhasil disimpan!', type: 'success' });
      setTimeMode('auto');
      setFormData({
        nama: '',
        kelas: '',
        kategori: 'Terlambat',
        jam: getCurrentTime(),
        alasan: ''
      });
    } catch (error) {
      console.error('Error adding record:', error);
      setToast({ message: 'Gagal menyimpan data.', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "backdrop-blur-md border rounded-3xl p-8 shadow-xl",
          darkMode ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-white/20"
        )}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className={cn("text-2xl font-bold", darkMode ? "text-white" : "text-gray-800")}>Input Data Piket</h2>
          <span className={cn(
            'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full',
            darkMode ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          )}>
            <Users size={12} />
            {studentNames.length} siswa terdaftar
          </span>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 relative" ref={suggestionRef}>
            <label className={cn("text-sm font-medium", darkMode ? "text-slate-400" : "text-gray-600")}>Nama Siswa</label>
            <div className="relative">
              <input
                required
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                onFocus={() => formData.nama.length > 0 && setShowSuggestions(true)}
                placeholder="Ketik nama siswa..."
                className={cn(
                  "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all",
                  darkMode ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" : "bg-white border-gray-200 text-gray-800"
                )}
              />
              <Search className={cn("absolute right-4 top-1/2 -translate-y-1/2", darkMode ? "text-slate-500" : "text-gray-400")} size={18} />
            </div>

            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "absolute z-50 w-full mt-1 border rounded-xl shadow-2xl max-h-60 overflow-y-auto",
                    darkMode ? "bg-slate-800 border-slate-600" : "bg-white border-gray-100"
                  )}
                >
                  {suggestions.length > 0 ? (
                    suggestions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          const autoKelas = studentKelasMap[name] || '';
                          setFormData({ ...formData, nama: name, kelas: autoKelas || formData.kelas });
                          setShowSuggestions(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 transition-colors font-medium border-b last:border-0 flex items-center justify-between",
                          darkMode ? "text-slate-200 hover:bg-slate-700 border-slate-700" : "text-gray-700 hover:bg-blue-50 border-gray-50"
                        )}
                      >
                        <span>{name}</span>
                        {studentKelasMap[name] && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold ml-2 flex-shrink-0">
                            {studentKelasMap[name]}
                          </span>
                        )}
                      </button>
                    ))
                  ) : formData.nama.length > 2 && (
                    <div className={cn("px-4 py-3 text-sm italic flex items-center gap-2", darkMode ? "text-slate-400" : "text-gray-500")}>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-bold text-[10px]">SISWA BARU</span>
                      <span>"{formData.nama}" tidak ada di daftar.</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className={cn("text-sm font-medium", darkMode ? "text-slate-400" : "text-gray-600")}>Kelas</label>
              <select
                required
                value={formData.kelas}
                onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all",
                  darkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-gray-800"
                )}
              >
                <option value="">Pilih Kelas</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className={cn("text-sm font-medium", darkMode ? "text-slate-400" : "text-gray-600")}>Kategori</label>
              <select
                required
                value={formData.kategori}
                onChange={(e) => setFormData({ ...formData, kategori: e.target.value as any })}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all",
                  darkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-gray-800"
                )}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className={cn("text-sm font-medium", darkMode ? "text-slate-400" : "text-gray-600")}>Jam Kejadian</label>
            {/* Toggle: Waktu Saat Ini vs Pilih Waktu */}
            <div className={cn(
              "flex rounded-xl overflow-hidden border p-1 gap-1",
              darkMode ? "bg-slate-700 border-slate-600" : "bg-gray-100 border-gray-200"
            )}>
              <button
                type="button"
                onClick={() => setTimeMode('auto')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200",
                  timeMode === 'auto'
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                    : darkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Clock size={14} />
                Waktu Saat Ini
              </button>
              <button
                type="button"
                onClick={() => setTimeMode('manual')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200",
                  timeMode === 'manual'
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                    : darkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <AlarmClock size={14} />
                Pilih Waktu
              </button>
            </div>

            {/* Auto Mode: show live running clock */}
            {timeMode === 'auto' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border",
                  darkMode ? "bg-slate-700/60 border-slate-600" : "bg-blue-50 border-blue-200"
                )}
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className={cn(
                  "font-mono text-xl font-bold tracking-widest",
                  darkMode ? "text-white" : "text-blue-700"
                )}>{liveTime}</span>
                <span className={cn("text-xs ml-auto", darkMode ? "text-slate-400" : "text-blue-400")}>Otomatis</span>
              </motion.div>
            )}

            {/* Manual Mode: time picker */}
            {timeMode === 'manual' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <input
                  required
                  type="time"
                  value={formData.jam}
                  onChange={(e) => setFormData({ ...formData, jam: e.target.value })}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all",
                    darkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-gray-800"
                  )}
                />
              </motion.div>
            )}
          </div>

          <div className="space-y-2">
            <label className={cn("text-sm font-medium", darkMode ? "text-slate-400" : "text-gray-600")}>Alasan / Keterangan</label>
            <textarea
              value={formData.alasan}
              onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
              placeholder="Berikan alasan singkat..."
              className={cn(
                "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all h-32 resize-none",
                darkMode ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" : "bg-white border-gray-200 text-gray-800"
              )}
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className={cn(
              "w-full py-4 rounded-xl font-bold text-white transition-all transform active:scale-95 shadow-lg",
              loading ? "bg-gray-400" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            )}
          >
            {loading ? "Menyimpan..." : "Simpan Data"}
          </button>
        </form>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-white z-50",
              toast.type === 'success' ? "bg-emerald-500" : "bg-rose-500"
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
