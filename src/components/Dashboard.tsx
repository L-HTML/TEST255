import React, { useMemo, useRef, useEffect, useState } from 'react';
import { PiketRecord } from '../types';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Users, Clock, LogOut, Plane, TrendingUp, CalendarDays } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// ── Helper: format timestamp → "19 Mei 2026" ──────────────────────────────
function formatShortDate(ts: string) {
  try {
    return new Date(ts).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return ''; }
}

// ── Auto-scrolling list component ─────────────────────────────────────────
interface ScrollListProps {
  records: PiketRecord[];
  color: string;
  darkMode: boolean;
  onRowClick: () => void;
}

function ScrollableRecordList({ records, color, darkMode, onRowClick }: ScrollListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPaused    = useRef(false);
  const rafRef      = useRef<number | null>(null);
  const AUTO_SCROLL = records.length > 5;

  useEffect(() => {
    if (!AUTO_SCROLL) return;
    const el = containerRef.current;
    if (!el) return;

    // Smooth continuous scroll — 0.4 px per frame ≈ ~24px/s at 60fps
    const step = () => {
      if (!isPaused.current && el) {
        el.scrollTop += 0.4;
        // Seamless loop: subtract half instead of resetting to 0 — no visual jump
        if (el.scrollTop >= el.scrollHeight / 2) {
          el.scrollTop -= el.scrollHeight / 2;
        }
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [AUTO_SCROLL, records.length]);

  const sorted = useMemo(() =>
    [...records].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [records]
  );

  // Duplicate list so scroll loops seamlessly (only when auto-scrolling)
  const displayList = AUTO_SCROLL ? [...sorted, ...sorted] : sorted;

  const avatarCls = cn(
    'w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5',
    color === 'blue'    && (darkMode ? 'bg-blue-800/70 text-blue-300'    : 'bg-blue-100 text-blue-600'),
    color === 'rose'    && (darkMode ? 'bg-rose-800/70 text-rose-300'    : 'bg-rose-100 text-rose-600'),
    color === 'amber'   && (darkMode ? 'bg-amber-800/70 text-amber-300'  : 'bg-amber-100 text-amber-600'),
    color === 'emerald' && (darkMode ? 'bg-emerald-800/70 text-emerald-300' : 'bg-emerald-100 text-emerald-600'),
  );

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto"
      style={{ maxHeight: '200px' }}
      onMouseEnter={() => { isPaused.current = true; }}
      onMouseLeave={() => { isPaused.current = false; }}
    >
      {displayList.map((r, i) => (
        <div
          key={`${r.id ?? i}-${i}`}
          onClick={onRowClick}
          className={cn(
            'flex items-start gap-2 px-3 py-2 text-xs transition-colors cursor-pointer',
            i > 0 && (darkMode ? 'border-t border-slate-700/40' : 'border-t border-gray-100'),
            darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-blue-50/60'
          )}
        >
          {/* Avatar */}
          <div className={avatarCls}>{r.nama.charAt(0)}</div>

          {/* Info — date placed below name so name is never hidden */}
          <div className="min-w-0 flex-1">
            {/* Baris 1: Nama penuh */}
            <p className={cn('font-bold truncate leading-tight', darkMode ? 'text-slate-200' : 'text-gray-800')}>
              {r.nama}
            </p>
            {/* Baris 2: Kelas · Jam */}
            <p className={cn('text-[10px] truncate leading-tight mt-0.5', darkMode ? 'text-slate-500' : 'text-gray-400')}>
              {r.kelas} · {r.jam}
            </p>
            {/* Baris 3: Tanggal badge */}
            <div className={cn(
              'inline-flex items-center gap-0.5 mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md',
              darkMode ? 'bg-slate-700/80 text-slate-400' : 'bg-gray-100 text-gray-500'
            )}>
              <CalendarDays size={8} />
              <span>{formatShortDate(r.timestamp)}</span>
            </div>
            {/* Baris 4: Alasan (jika ada) */}
            {r.alasan && (
              <p className={cn('text-[10px] truncate italic mt-0.5', darkMode ? 'text-slate-600' : 'text-gray-400')}>
                "{r.alasan}"
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
interface DashboardProps {
  records: PiketRecord[];
  onCardClick: (category: string) => void;
  darkMode: boolean;
  timeFilter?: 'today' | 'week' | 'month' | 'year';
}

export default function Dashboard({ records, onCardClick, darkMode, timeFilter = 'today' }: DashboardProps) {
  const filterLabel: Record<string, string> = {
    today: 'Hari Ini',
    week:  'Minggu Ini',
    month: 'Bulan Ini',
    year:  'Tahun Ini',
  };

  const stats = useMemo(() => ({
    total:     records.length,
    terlambat: records.filter(r => r.kategori === 'Terlambat').length,
    izinKeluar: records.filter(r => r.kategori === 'Izin Keluar').length,
    izinPulang: records.filter(r => r.kategori === 'Izin Pulang').length,
  }), [records]);

  const pieData = useMemo(() => ({
    labels: ['Terlambat', 'Izin Keluar', 'Izin Pulang', 'Lainnya'],
    datasets: [{
      data: [
        records.filter(r => r.kategori === 'Terlambat').length,
        records.filter(r => r.kategori === 'Izin Keluar').length,
        records.filter(r => r.kategori === 'Izin Pulang').length,
        records.filter(r => r.kategori === 'Lainnya').length,
      ],
      backgroundColor: [
        'rgba(244, 63, 94, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(100, 116, 139, 0.8)',
      ],
      borderColor: darkMode ? '#1e293b' : '#fff',
      borderWidth: 2,
    }]
  }), [records, darkMode]);

  const barData = useMemo(() => {
    const classCounts: Record<string, number> = {};
    records.forEach(r => { classCounts[r.kelas] = (classCounts[r.kelas] || 0) + 1; });
    const sortedClasses = Object.keys(classCounts).sort();
    return {
      labels: sortedClasses,
      datasets: [{
        label: 'Jumlah Pelanggaran',
        data: sortedClasses.map(c => classCounts[c]),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderRadius: 8,
      }]
    };
  }, [records]);

  const statCards = [
    { label: `Total ${filterLabel[timeFilter]}`, value: stats.total,      icon: Users,  color: 'blue',    category: 'Semua'      },
    { label: 'Terlambat',                         value: stats.terlambat,  icon: Clock,  color: 'rose',    category: 'Terlambat'  },
    { label: 'Izin Keluar',                        value: stats.izinKeluar, icon: LogOut, color: 'amber',   category: 'Izin Keluar'},
    { label: 'Izin Pulang',                        value: stats.izinPulang, icon: Plane,  color: 'emerald', category: 'Izin Pulang'},
  ];

  return (
    <div className="space-y-8">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const cardRecords = card.category === 'Semua'
            ? records
            : records.filter(r => r.kategori === card.category);

          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className={cn(
                'backdrop-blur-md border rounded-3xl p-6 shadow-lg transition-all flex flex-col',
                darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-white/20'
              )}>
                {/* Icon + badge */}
                <div className="flex justify-between items-start mb-3">
                  <div className={cn(
                    'p-3 rounded-2xl',
                    card.color === 'blue'    && (darkMode ? 'bg-blue-900/50 text-blue-400'       : 'bg-blue-50 text-blue-600'),
                    card.color === 'rose'    && (darkMode ? 'bg-rose-900/50 text-rose-400'       : 'bg-rose-50 text-rose-600'),
                    card.color === 'amber'   && (darkMode ? 'bg-amber-900/50 text-amber-400'     : 'bg-amber-50 text-amber-600'),
                    card.color === 'emerald' && (darkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-50 text-emerald-600'),
                  )}>
                    <card.icon size={22} />
                  </div>
                  {card.value > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
                      <TrendingUp size={10} /> NEW
                    </span>
                  )}
                </div>

                {/* Label + Count */}
                <p className={cn('text-xs font-semibold mb-0.5', darkMode ? 'text-slate-400' : 'text-gray-500')}>
                  {card.label}
                </p>
                <h3 className={cn('text-3xl font-black mb-4', darkMode ? 'text-white' : 'text-gray-800')}>
                  {card.value}
                </h3>

                {/* ── Detail Panel ── */}
                <div className={cn(
                  'rounded-2xl border overflow-hidden flex flex-col',
                  darkMode ? 'bg-slate-900/50 border-slate-700/60' : 'bg-gray-50/80 border-gray-100'
                )}>
                  {/* Panel header */}
                  <div className={cn(
                    'flex items-center justify-between px-3 py-1.5 border-b',
                    darkMode ? 'border-slate-700/60' : 'border-gray-100'
                  )}>
                    <p className={cn('text-[10px] font-bold uppercase tracking-wider', darkMode ? 'text-slate-500' : 'text-gray-400')}>
                      Rincian · {filterLabel[timeFilter]}
                      {cardRecords.length > 5 && (
                        <span className="ml-1 text-[8px] normal-case text-blue-400 font-semibold">(auto-scroll)</span>
                      )}
                    </p>
                    {cardRecords.length > 0 && (
                      <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                        card.color === 'blue'    && (darkMode ? 'bg-blue-900/60 text-blue-400'       : 'bg-blue-100 text-blue-600'),
                        card.color === 'rose'    && (darkMode ? 'bg-rose-900/60 text-rose-400'       : 'bg-rose-100 text-rose-600'),
                        card.color === 'amber'   && (darkMode ? 'bg-amber-900/60 text-amber-400'     : 'bg-amber-100 text-amber-600'),
                        card.color === 'emerald' && (darkMode ? 'bg-emerald-900/60 text-emerald-400' : 'bg-emerald-100 text-emerald-600'),
                      )}>
                        {cardRecords.length}
                      </span>
                    )}
                  </div>

                  {/* List or empty state */}
                  {cardRecords.length > 0 ? (
                    <ScrollableRecordList
                      records={cardRecords}
                      color={card.color}
                      darkMode={darkMode}
                      onRowClick={() => onCardClick(card.category)}
                    />
                  ) : (
                    <div className="py-5 flex flex-col items-center justify-center gap-1">
                      <p className={cn('text-[11px] font-medium', darkMode ? 'text-slate-600' : 'text-gray-400')}>
                        Belum ada data
                      </p>
                      <p className={cn('text-[10px]', darkMode ? 'text-slate-700' : 'text-gray-300')}>
                        {filterLabel[timeFilter]}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn('backdrop-blur-md border rounded-3xl p-8 shadow-xl', darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-white/20')}
        >
          <h3 className={cn('text-xl font-bold mb-6', darkMode ? 'text-white' : 'text-gray-800')}>Distribusi Kategori</h3>
          <div className="h-64 flex justify-center">
            <Pie data={pieData} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { color: darkMode ? '#94a3b8' : '#374151' } } } }} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn('backdrop-blur-md border rounded-3xl p-8 shadow-xl', darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-white/20')}
        >
          <h3 className={cn('text-xl font-bold mb-6', darkMode ? 'text-white' : 'text-gray-800')}>Data per Kelas</h3>
          <div className="h-64">
            <Bar
              data={barData}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { stepSize: 1, color: darkMode ? '#94a3b8' : '#374151' }, grid: { color: darkMode ? '#334155' : '#f3f4f6' } },
                  x: { ticks: { color: darkMode ? '#94a3b8' : '#374151' }, grid: { color: darkMode ? '#334155' : '#f3f4f6' } }
                }
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
