import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, PiketRecord, AppView } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import InputForm from './components/InputForm';
import RecordsTable from './components/RecordsTable';
import StudentManager from './components/StudentManager';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Download,
  Moon,
  Sun,
  ShieldCheck,
  FileSpreadsheet,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  CalendarDays,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';


export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<AppView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [records, setRecords] = useState<PiketRecord[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isDashboardUnlocked, setIsDashboardUnlocked] = useState(false);
  const [pendingView, setPendingView] = useState<AppView>('dashboard');
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'year'>('today');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: firebaseUser.uid, ...userDoc.data() } as UserProfile);
        } else {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            role: firebaseUser.email === 'seshhhhh40@gmail.com' ? 'admin' : 'input-only'
          });
        }
      } else {
        setUser(null);
        setIsDashboardUnlocked(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'records'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PiketRecord));
      // Pembagian Hak Akses: Admin melihat semua, User hanya melihat miliknya
      const filteredData = user.role === 'admin' ? data : data.filter(record => record.createdBy === user.uid);
      setRecords(filteredData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = () => {
    signOut(auth);
    setIsDashboardUnlocked(false);
  };

  const openProtectedView = (targetView: AppView) => {
    if (isDashboardUnlocked) {
      setView(targetView);
    } else {
      setPendingView(targetView);
      setShowPinModal(true);
    }
  };

  const verifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234' || pin === 'embege') {
      setIsDashboardUnlocked(true);
      setShowPinModal(false);
      setView(pendingView);
      setPin('');
      setPinError(false);
      setShowPin(false);
    } else {
      setPinError(true);
      setPin('');
      // Animasi shake — reset setelah 500ms
      setTimeout(() => setPinError(false), 600);
    }
  };

  const closePinModal = () => {
    setShowPinModal(false);
    setPin('');
    setPinError(false);
    setShowPin(false);
  };

  // Time-range filtered records
  const timeFilteredRecords = useMemo(() => {
    const now = new Date();
    return records.filter(r => {
      try {
        const d = new Date(r.timestamp);
        if (timeFilter === 'today') {
          return d.toLocaleDateString('en-CA') === now.toLocaleDateString('en-CA');
        } else if (timeFilter === 'week') {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          return d >= startOfWeek;
        } else if (timeFilter === 'month') {
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        } else if (timeFilter === 'year') {
          return d.getFullYear() === now.getFullYear();
        }
        return true;
      } catch { return false; }
    });
  }, [records, timeFilter]);

  const exportToCSV = () => {
    const headers = ['Nama', 'Kelas', 'Kategori', 'Jam', 'Alasan', 'Waktu'];
    const rows = records.map(r => [
      r.nama,
      r.kelas,
      r.kategori,
      r.jam,
      r.alasan || '',
      r.timestamp
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `data_piket_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center", darkMode ? "bg-slate-900" : "bg-blue-50")}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) return <Login />;

  const navItems = [
    { id: 'input',     label: 'Input Data Siswa',  icon: PlusCircle,      roles: ['admin', 'input-only'], protected: false },
    { id: 'dashboard', label: 'Dashboard & Monitor', icon: LayoutDashboard, roles: ['admin', 'input-only'], protected: true  },
    { id: 'records',   label: 'Data Lengkap',       icon: ClipboardList,   roles: ['admin', 'input-only'], protected: true  },
    { id: 'students',  label: 'Kelola Siswa',        icon: GraduationCap,   roles: ['admin'],               protected: true  },
  ];

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      darkMode ? "bg-slate-900 text-white" : "bg-blue-50/50 text-slate-900"
    )}>
      {/* Mobile Header */}
      <header className={cn(
        "lg:hidden flex items-center justify-between p-4 backdrop-blur-md border-b sticky top-0 z-40",
        darkMode ? "bg-slate-800/90 border-slate-700" : "bg-white/80 border-gray-100"
      )}>
        <h1 className="text-xl font-black text-blue-500">Control Piket</h1>
        <button onClick={() => setSidebarOpen(true)} className={cn("p-2", darkMode ? "text-slate-300" : "text-gray-600")}>
          <Menu size={24} />
        </button>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 backdrop-blur-2xl border-r transform transition-transform duration-300 lg:translate-x-0",
        darkMode ? "bg-slate-800/95 border-slate-700" : "bg-white/90 border-gray-100",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-10">
            <h1 className="text-2xl font-black text-blue-500">Control Piket</h1>
            <button onClick={() => setSidebarOpen(false)} className={cn("lg:hidden p-2", darkMode ? "text-slate-400" : "text-gray-400")}>
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.protected && !isDashboardUnlocked) {
                    openProtectedView(item.id as AppView);
                  } else {
                    setView(item.id as AppView);
                  }
                  setSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all",
                  // hide admin-only items from non-admins
                  item.roles.includes('admin') && !item.roles.includes('input-only') && user.role !== 'admin'
                    ? 'hidden'
                    : view === item.id
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                      : darkMode
                        ? "text-slate-400 hover:bg-slate-700 hover:text-blue-400"
                        : "text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                )}
              >
                <item.icon size={20} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.protected && !isDashboardUnlocked && view !== item.id && (
                  <Lock size={13} className="opacity-40" />
                )}
              </button>
            ))}
          </nav>

          <div className={cn("pt-6 border-t space-y-4", darkMode ? "border-slate-700" : "border-gray-100")}>
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 font-bold">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-bold truncate", darkMode ? "text-white" : "text-gray-800")}>{user.displayName || user.email.split('@')[0]}</p>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">{user.role}</p>
              </div>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all",
                darkMode ? "text-yellow-400 hover:bg-slate-700" : "text-gray-500 hover:bg-gray-50"
              )}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold text-rose-500 hover:bg-rose-500/10 transition-all"
            >
              <LogOut size={20} />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 p-6 lg:p-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h2 className={cn("text-3xl font-black", darkMode ? "text-white" : "text-gray-800")}>
                {view === 'dashboard' && (user.role === 'admin' ? 'Dashboard Monitoring (Semua Data)' : 'Dashboard Pribadi (Data Anda)')}
                {view === 'input' && 'Input Data Siswa'}
                {view === 'records' && 'Data Kedisiplinan'}
                {view === 'students' && 'Kelola Daftar Siswa'}
              </h2>
              <p className={cn("mt-1", darkMode ? "text-slate-400" : "text-gray-500")}>
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Time Filter Pills */}
              {(view === 'dashboard' || view === 'records') && (
                <div className={cn(
                  "flex items-center gap-1 p-1 rounded-2xl border",
                  darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"
                )}>
                  <CalendarDays size={15} className={cn("ml-2 mr-1 flex-shrink-0", darkMode ? "text-slate-500" : "text-gray-400")} />
                  {([['today','Hari Ini'],['week','Minggu Ini'],['month','Bulan Ini'],['year','Tahun Ini']] as [typeof timeFilter, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setTimeFilter(key)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200",
                        timeFilter === key
                          ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow"
                          : darkMode
                            ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {view === 'dashboard' && user.role === 'admin' && (
                <button
                  onClick={exportToCSV}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 border rounded-2xl font-bold transition-all shadow-sm",
                    darkMode ? "bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Download size={20} />
                  Export CSV
                </button>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'dashboard' && <Dashboard records={timeFilteredRecords} onCardClick={(cat) => setView('records')} darkMode={darkMode} timeFilter={timeFilter} />}
              {view === 'input' && <InputForm darkMode={darkMode} />}
              {view === 'records' && <RecordsTable records={timeFilteredRecords} darkMode={darkMode} userRole={user.role} />}
              {view === 'students' && user.role === 'admin' && <StudentManager darkMode={darkMode} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* PIN Modal — Redesigned */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePinModal}
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-lg"
            />

            {/* Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: pinError ? [0, -10, 10, -8, 8, 0] : 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 32 }}
              transition={{ duration: 0.25, x: { duration: 0.4 } }}
              className={cn(
                "relative w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden",
                darkMode ? "bg-slate-800" : "bg-white"
              )}
            >
              {/* Header strip */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 pt-8 pb-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <ShieldCheck size={34} className="text-white" />
                </div>
                <h3 className="text-xl font-black text-white">Akses Terkunci</h3>
                <p className="text-blue-100 text-sm mt-1">
                  Dashboard & Monitoring
                </p>
              </div>

              {/* Body */}
              <div className="px-8 py-7">
                <p className={cn("text-sm text-center mb-5 font-medium", darkMode ? "text-slate-400" : "text-gray-500")}>
                  Masukkan sandi untuk membuka akses
                </p>

                {/* Dot indicators */}
                <div className="flex justify-center gap-2.5 mb-5">
                  {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: i === pin.length - 1 ? [1, 1.3, 1] : 1 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "w-3 h-3 rounded-full transition-all duration-200",
                        i < pin.length
                          ? pinError
                            ? "bg-rose-500"
                            : "bg-blue-600"
                          : darkMode
                            ? "bg-slate-600"
                            : "bg-gray-200"
                      )}
                    />
                  ))}
                </div>

                <form onSubmit={verifyPin} className="space-y-3">
                  {/* Input field */}
                  <div className="relative">
                    <input
                      autoFocus
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => { setPin(e.target.value); setPinError(false); }}
                      placeholder="Ketik sandi di sini..."
                      className={cn(
                        "w-full px-5 py-3.5 pr-12 rounded-xl border-2 focus:outline-none transition-all text-center font-bold text-lg tracking-widest",
                        pinError
                          ? "border-rose-400 bg-rose-50 text-rose-600 focus:border-rose-500"
                          : darkMode
                            ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                            : "bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-500 focus:bg-white"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className={cn(
                        "absolute right-4 top-1/2 -translate-y-1/2",
                        darkMode ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Error message */}
                  <AnimatePresence>
                    {pinError && (
                      <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-rose-500 text-sm font-semibold text-center"
                      >
                        ❌ Sandi salah, coba lagi
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={closePinModal}
                      className={cn(
                        "flex-1 py-3.5 font-bold rounded-xl transition-all text-sm",
                        darkMode
                          ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={!pin}
                      className={cn(
                        "flex-[2] py-3.5 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2",
                        pin
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      <ShieldCheck size={16} />
                      Buka Akses
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
        />
      )}
    </div>
  );
}

