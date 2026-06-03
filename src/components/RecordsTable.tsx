import React, { useState, useMemo } from 'react';
import { PiketRecord } from '../types';
import { cn, formatDate } from '../lib/utils';
import { Search, Filter, ArrowUpDown, MoreHorizontal, Clock, User, GraduationCap, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface RecordsTableProps {
  records: PiketRecord[];
  darkMode: boolean;
  userRole?: string;
}

export default function RecordsTable({ records, darkMode, userRole }: RecordsTableProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');

  const [selectedRecord, setSelectedRecord] = useState<PiketRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus data ini?')) {
      setIsDeleting(true);
      try {
        await deleteDoc(doc(db, 'records', id));
        setSelectedRecord(null); // Tutup modal jika sedang terbuka
      } catch (error) {
        console.error('Gagal menghapus data:', error);
        alert('Gagal menghapus data');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const filteredRecords = useMemo(() => {
    return records
      .filter(r => {
        const matchesSearch = r.nama.toLowerCase().includes(search.toLowerCase()) || 
                             r.kelas.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === 'Semua' || r.kategori === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [records, search, categoryFilter]);

  return (
    <div className="space-y-6">
      <div 
        className={cn(
          "flex flex-col md:flex-row gap-4 justify-between items-center backdrop-blur-sm p-4 rounded-2xl border",
          darkMode ? "bg-slate-800/50 border-slate-700" : "bg-white/50 border-white/20"
        )}
      >
        <div className="relative w-full md:w-96">
          <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2", darkMode ? "text-slate-500" : "text-gray-400")} size={18} />
          <input
            type="text"
            placeholder="Cari nama atau kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full pl-12 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all",
              darkMode ? "bg-slate-700 border-slate-600 text-white placeholder:text-slate-500" : "bg-white border-gray-200 text-gray-800"
            )}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className={cn(darkMode ? "text-slate-500" : "text-gray-400")} size={18} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={cn(
              "w-full md:w-48 px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all",
              darkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-200 text-gray-800"
            )}
          >
            <option value="Semua">Semua Kategori</option>
            <option value="Terlambat">Terlambat</option>
            <option value="Izin Keluar">Izin Keluar</option>
            <option value="Izin Pulang">Izin Pulang</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
      </div>

      <div className={cn(
        "backdrop-blur-md rounded-3xl border shadow-xl overflow-hidden",
        darkMode ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-white/20"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={cn("border-b", darkMode ? "bg-slate-900/50 border-slate-700" : "bg-gray-50/50 border-gray-100")}>
                <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider", darkMode ? "text-slate-500" : "text-gray-400")}>Siswa</th>
                <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider", darkMode ? "text-slate-500" : "text-gray-400")}>Kategori</th>
                <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider", darkMode ? "text-slate-500" : "text-gray-400")}>Waktu</th>
                <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider", darkMode ? "text-slate-500" : "text-gray-400")}>Keterangan</th>
                {userRole === 'admin' && <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider text-right", darkMode ? "text-slate-500" : "text-gray-400")}>Aksi</th>}
              </tr>
            </thead>
            <tbody className={cn("divide-y", darkMode ? "divide-slate-700" : "divide-gray-100")}>
              {filteredRecords.map((record, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={record.id} 
                  onClick={() => setSelectedRecord(record)}
                  className={cn(
                    "hover:bg-blue-500/10 transition-colors group cursor-pointer",
                    darkMode ? "text-slate-200" : ""
                  )}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold">
                        {record.nama.charAt(0)}
                      </div>
                      <div>
                        <p className={cn("font-bold", darkMode ? "text-white" : "text-gray-800")}>{record.nama}</p>
                        <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-gray-500")}>{record.kelas}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 w-36">
                    <span className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap",
                      record.kategori === 'Terlambat' && "bg-rose-100 text-rose-600",
                      record.kategori === 'Izin Keluar' && "bg-amber-100 text-amber-600",
                      record.kategori === 'Izin Pulang' && "bg-emerald-100 text-emerald-600",
                      record.kategori === 'Lainnya' && "bg-slate-100 text-slate-600",
                    )}>
                      {record.kategori}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className={cn("font-medium", darkMode ? "text-slate-200" : "text-gray-700")}>{record.jam}</span>
                      <span className={cn("text-xs", darkMode ? "text-slate-500" : "text-gray-400")}>{formatDate(record.timestamp).split(',')[0]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className={cn("text-sm max-w-xs truncate", darkMode ? "text-slate-400" : "text-gray-600")}>{record.alasan || '-'}</p>
                  </td>
                  {userRole === 'admin' && (
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                        disabled={isDeleting}
                        className={cn(
                          "p-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100",
                          darkMode ? "hover:bg-rose-500/20 text-rose-400" : "hover:bg-rose-50 text-rose-500"
                        )}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </motion.tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={4} className={cn("px-6 py-12 text-center italic", darkMode ? "text-slate-500" : "text-gray-400")}>
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedRecord(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              "relative w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl overflow-hidden",
              darkMode ? "bg-slate-800" : "bg-white"
            )}
          >
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-3xl bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-black">
                  {selectedRecord.nama.charAt(0)}
                </div>
                <div>
                  <h3 className={cn("text-2xl font-black", darkMode ? "text-white" : "text-gray-800")}>{selectedRecord.nama}</h3>
                  <p className={cn("font-bold", darkMode ? "text-slate-400" : "text-gray-500")}>{selectedRecord.kelas}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                className={cn("p-2 rounded-full transition-colors", darkMode ? "hover:bg-slate-700" : "hover:bg-gray-100")}
              >
                <MoreHorizontal className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className={cn("p-4 rounded-2xl", darkMode ? "bg-slate-700" : "bg-gray-50")}>
                  <p className={cn("text-xs font-bold uppercase mb-1", darkMode ? "text-slate-400" : "text-gray-400")}>Kategori</p>
                  <p className={cn("font-bold", darkMode ? "text-white" : "text-gray-800")}>{selectedRecord.kategori}</p>
                </div>
                <div className={cn("p-4 rounded-2xl", darkMode ? "bg-slate-700" : "bg-gray-50")}>
                  <p className={cn("text-xs font-bold uppercase mb-1", darkMode ? "text-slate-400" : "text-gray-400")}>Jam</p>
                  <p className={cn("font-bold", darkMode ? "text-white" : "text-gray-800")}>{selectedRecord.jam}</p>
                </div>
              </div>

              <div className={cn("p-4 rounded-2xl", darkMode ? "bg-slate-700" : "bg-gray-50")}>
                <p className={cn("text-xs font-bold uppercase mb-1", darkMode ? "text-slate-400" : "text-gray-400")}>Tanggal</p>
                <p className={cn("font-bold", darkMode ? "text-white" : "text-gray-800")}>{formatDate(selectedRecord.timestamp)}</p>
              </div>

              <div className={cn(
                "p-4 rounded-2xl border",
                darkMode ? "bg-blue-900/30 border-blue-700" : "bg-blue-50 border-blue-100"
              )}>
                <p className={cn("text-xs font-bold uppercase mb-1", darkMode ? "text-blue-400" : "text-blue-400")}>Keterangan / Alasan</p>
                <p className={cn("font-medium leading-relaxed", darkMode ? "text-slate-200" : "text-blue-900")}>
                  {selectedRecord.alasan || 'Tidak ada keterangan tambahan.'}
                </p>
              </div>
            </div>

            <button 
              onClick={() => setSelectedRecord(null)}
              className={cn(
                "w-full mt-8 py-4 font-bold rounded-2xl transition-all",
                darkMode ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-gray-900 text-white hover:bg-gray-800"
              )}
            >
              Tutup Detail
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
