import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { supabase } from "../supabaseClient";
import { Icon } from "../components/SharedUI";
import { getDate, fmtDate, formatWA, generateExcel, generatePDF } from "../utils";

const WaliHistoryGrid = memo(({ logs, types, currDate, changeMonth }) => {
    const { year, month, daysInMonth, monthName, daysArray } = useMemo(() => {
        const year = currDate.getFullYear();
        const month = currDate.getMonth();
        return {
            year, month,
            daysInMonth: new Date(year, month + 1, 0).getDate(),
            monthName: currDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
            daysArray: Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1)
        };
    }, [currDate]);

    const currentMonthLogs = useMemo(() => {
        const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;
        return logs.filter(l => l.tglMelanggar >= startStr && l.tglMelanggar <= endStr);
    }, [logs, year, month, daysInMonth]);

    return (
        <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-slate-200 select-none font-sans">
            <div className="flex justify-between items-center bg-white p-4 border-b border-slate-200">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition"><Icon name="Chevron" className="w-5 h-5 rotate-90 text-slate-500" /></button>
                <span className="font-extrabold text-sm text-slate-800 uppercase tracking-widest flex-1 text-center">{monthName}</span>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-xl transition"><Icon name="Chevron" className="w-5 h-5 -rotate-90 text-slate-500" /></button>
            </div>
            <div className="overflow-x-auto custom-scrollbar pb-2 bg-white">
                <div className="inline-block min-w-full align-middle bg-white">
                    <div className="flex border-b border-slate-200 bg-white">
                        <div className="sticky left-0 z-20 w-40 min-w-[10rem] bg-white border-r border-slate-200 shrink-0 p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">KEGIATAN</div>
                        {daysArray.map(d => {
                            const dayName = ["Ahd", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][new Date(year, month, d).getDay()];
                            const isFriday = dayName === "Jum"; 
                            return (
                                <div key={d} className="h-11 min-w-[2.5rem] flex flex-col items-center justify-center border-r border-b border-slate-200 bg-white w-10">
                                    <span className={`text-[11px] font-bold leading-none ${isFriday ? 'text-rose-600' : 'text-slate-600'}`}>{d}</span>
                                    <span className={`text-[8px] mt-0.5 font-semibold ${isFriday ? 'text-rose-400' : 'text-slate-400'}`}>{dayName}</span>
                                </div>
                            );
                        })}
                    </div>
                    {types.map((jenis) => (
                        <div key={jenis.id} className="flex border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors bg-white">
                            <div className="sticky left-0 z-10 w-40 min-w-[10rem] bg-white border-r border-slate-200 shrink-0 px-3 py-2 text-[11px] font-semibold leading-tight flex items-center text-slate-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{jenis.nama}</div>
                            {daysArray.map(day => {
                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const violation = currentMonthLogs.find(l => l.jenis === jenis.nama && l.tglMelanggar === dateStr);
                                let cellClass = "bg-white text-transparent"; let content = "";
                                if (violation) { cellClass = "bg-rose-500 text-white font-bold shadow-inner"; content = "X"; }
                                return <div key={day} className={`h-10 min-w-[2.5rem] flex items-center justify-center border-r border-b border-slate-100 text-xs transition-colors ${cellClass} w-10`}>{content}</div>;
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default function WaliDashboard({ santriId }) {
    const [data, setData] = useState({ profile: null, logs: [], notes: [], prestasi: [], types: [], sysWa: "", loading: true, error: null });
    const [selectedDate, setSelectedDate] = useState(() => new Date());

    const changeMonth = useCallback((delta) => {
        setSelectedDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + delta); return d; });
    }, []);

    useEffect(() => {
        const fetchWaliData = async () => {
            try {
                const { data: profile, error: errProfile } = await supabase.from('master_santri').select('*').eq('id', santriId).single();
                if (errProfile || !profile) throw new Error("Data santri tidak ditemukan");
                
                const [l, c, pRes, t, waRes] = await Promise.all([
                    supabase.from('logs_pelanggaran').select('*').eq('nama', profile.nama).order('tglMelanggar', { ascending: false }),
                    supabase.from('santri_catatan').select('*').eq('nama', profile.nama).order('createdAt', { ascending: false }),
                    supabase.from('santri_prestasi').select('*').eq('nama', profile.nama).order('createdAt', { ascending: false }),
                    supabase.from('master_jenis').select('*').order('nama'),
                    supabase.from('santri_catatan').select('isi').eq('nama', 'SYSTEM_WA').limit(1)
                ]);
                
                const sysWa = (waRes.data && waRes.data.length > 0) ? waRes.data[0].isi : "";
                setData({ profile, logs: l.data || [], notes: c.data || [], prestasi: pRes.data || [], types: t.data || [], sysWa, loading: false, error: null });
            } catch (err) {
                setData({ profile: null, logs: [], notes: [], prestasi: [], types: [], sysWa: "", loading: false, error: err.message });
            }
        };
        fetchWaliData();
    }, [santriId]);

    if (data.loading) return <div className="min-h-screen bg-[#F4F7F9] flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-slate-300 border-t-indigo-500 rounded-full"></div></div>;
    if (data.error) return <div className="min-h-screen bg-[#F4F7F9] flex items-center justify-center p-6 text-center font-sans"><div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm mx-auto"><div className="text-rose-500 text-6xl mb-4">⚠️</div><h2 className="font-bold text-xl text-slate-800 mb-2">Akses Ditolak</h2><p className="text-sm text-slate-500">{data.error}</p></div></div>;

    const { profile, logs, notes, prestasi, types, sysWa } = data;
    
    const d = new Date();
    const todayStr = getDate(d);
    const dWeek = new Date(); dWeek.setDate(dWeek.getDate() - 7);
    const weekStr = getDate(dWeek);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

    const cToday = logs.filter(l => l.tglMelanggar === todayStr).length;
    const cWeek = logs.filter(l => l.tglMelanggar >= weekStr && l.tglMelanggar <= todayStr).length;
    const cMonth = logs.filter(l => l.tglMelanggar >= monthStr && l.tglMelanggar <= todayStr).length;

    const getStatStyle = (count) => {
        if (count === 0) return { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-white', label: 'text-emerald-100', icon: 'bg-white' };
        if (count <= 2) return { bg: 'bg-amber-400', border: 'border-amber-500', text: 'text-white', label: 'text-amber-50', icon: 'bg-white' };
        return { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-white', label: 'text-rose-100', icon: 'bg-white' };
    };

    const weekStyle = getStatStyle(cWeek);
    const monthStyle = getStatStyle(cMonth);

    const selYear = selectedDate.getFullYear();
    const selMonth = selectedDate.getMonth();
    const filteredDetailsLogs = logs.filter(l => {
        const ld = new Date(l.tglMelanggar);
        return ld.getFullYear() === selYear && ld.getMonth() === selMonth;
    });

    return (
        <div className="min-h-screen bg-[#F4F7F9] font-sans text-slate-800 pb-28 selection:bg-indigo-100 relative">
            <div className="absolute top-0 left-0 right-0 h-96 bg-slate-200/50 -z-10 rounded-b-[4rem]"></div>

            <div className="max-w-md mx-auto p-5 space-y-6 relative z-10 pt-8">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-3xl p-8 shadow-xl flex flex-col items-center text-center text-white border border-indigo-400/30">
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-5 shadow-inner border border-white/30 backdrop-blur-sm">
                         <Icon name="User" className="w-12 h-12 text-white" />
                    </div>
                    <p className="text-[10px] font-medium text-blue-200 uppercase tracking-[0.2em] mb-2">Absensi Kegiatan PP Daruttauhid Al 'Alawiyyah</p>
                    <h1 className="text-[28px] font-black mb-6 tracking-tight text-white">{profile.nama}</h1>
                    
                    <div className={`px-5 py-3 rounded-2xl text-[11px] font-bold flex items-center gap-2 border ${cToday === 0 ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30' : 'bg-rose-500/20 text-rose-100 border-rose-400/30'}`}>
                        {cToday === 0 ? (
                            <>✓ Hari Ini: Belum Ada Catatan Tidak Hadir</>
                        ) : (
                            <>✗ Tidak Hadir {cToday} Kegiatan Hari Ini</>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className={`rounded-3xl p-6 border ${weekStyle.border} ${weekStyle.bg} flex flex-col items-center text-center shadow-lg`}>
                        <span className={`text-[10px] font-extrabold ${weekStyle.label} uppercase mb-3 tracking-widest`}>Minggu Ini</span>
                        <div className="flex items-center justify-center gap-3 mb-1">
                            <span className={`text-[42px] leading-none font-black ${weekStyle.text}`}>{cWeek}</span>
                            <span className={`w-3.5 h-3.5 rounded-full ${weekStyle.icon} opacity-80`}></span>
                        </div>
                        <span className={`text-[10px] font-bold ${weekStyle.label} uppercase tracking-widest mt-2`}>Ketidakhadiran</span>
                    </div>
                    <div className={`rounded-3xl p-6 border ${monthStyle.border} ${monthStyle.bg} flex flex-col items-center text-center shadow-lg`}>
                        <span className={`text-[10px] font-extrabold ${monthStyle.label} uppercase mb-3 tracking-widest`}>Bulan Ini</span>
                        <div className="flex items-center justify-center gap-3 mb-1">
                            <span className={`text-[42px] leading-none font-black ${monthStyle.text}`}>{cMonth}</span>
                            <span className={`w-3.5 h-3.5 rounded-full ${monthStyle.icon} opacity-80`}></span>
                        </div>
                        <span className={`text-[10px] font-bold ${monthStyle.label} uppercase tracking-widest mt-2`}>Ketidakhadiran</span>
                    </div>
                </div>

                {prestasi.length > 0 && (
                    <div className="bg-emerald-50 rounded-3xl p-6 shadow-md border border-emerald-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                        <h3 className="font-bold text-sm text-emerald-900 mb-4 flex items-center gap-2">
                            <Icon name="Star" className="w-5 h-5 text-emerald-600" /> Prestasi & Pencapaian
                        </h3>
                        <div className="space-y-3">
                            {prestasi.map(p => (
                                <div key={p.id} className="bg-white p-4 rounded-2xl text-sm text-emerald-800 leading-relaxed border border-emerald-100 font-medium shadow-sm flex gap-3 items-center">
                                    <Icon name="Trophy" className="w-6 h-6 text-yellow-500 shrink-0" />
                                    <span>{p.prestasi}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {notes.length > 0 && (
                    <div className="bg-amber-100 rounded-3xl p-6 shadow-md border border-amber-300 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
                        <h3 className="font-bold text-sm text-amber-900 mb-4 flex items-center gap-2"><Icon name="Edit" className="w-5 h-5 text-amber-600" /> Catatan untuk Wali Santri</h3>
                        <div className="space-y-3">
                            {notes.map(n => (<div key={n.id} className="bg-amber-50 p-4 rounded-2xl text-sm text-amber-800 leading-relaxed border border-amber-200 font-medium">"{n.isi}"</div>))}
                        </div>
                    </div>
                )}

                <div className="pt-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-3 px-2 gap-3">
                         <h3 className="font-bold text-sm text-slate-800">Riwayat Kehadiran</h3>
                         <div className="flex gap-2">
                             <button onClick={() => generateExcel(data.profile.nama, data.logs, data.types, selectedDate)} className="text-[10px] bg-white text-indigo-600 border border-slate-200 px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 hover:bg-indigo-50 hover:border-indigo-200 transition shadow-sm">
                                 <Icon name="Download" className="w-3.5 h-3.5" /> Simpan (XLS)
                             </button>
                             <button onClick={() => generatePDF(data.profile.nama, data.logs, data.types, selectedDate)} className="text-[10px] bg-white text-rose-600 border border-slate-200 px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 hover:bg-rose-50 hover:border-rose-200 transition shadow-sm">
                                 <Icon name="Download" className="w-3.5 h-3.5" /> Simpan (PDF)
                             </button>
                         </div>
                    </div>
                    <WaliHistoryGrid logs={logs} types={types} currDate={selectedDate} changeMonth={changeMonth} />
                </div>

                <div className="bg-sky-50 rounded-3xl shadow-md border border-sky-200 overflow-hidden mt-6">
                    <div className="p-6 bg-sky-100 border-b border-sky-200 flex flex-col items-center text-center gap-1.5">
                        <h3 className="font-extrabold text-sm text-sky-900 flex items-center gap-2"><Icon name="List" className="w-5 h-5 text-sky-600" /> Rincian Kegiatan yang Ditinggalkan</h3>
                        <span className="text-[10px] uppercase font-bold text-sky-600 tracking-widest">
                            Bulan: {selectedDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                    <div className="divide-y divide-sky-100 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {filteredDetailsLogs.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-sky-100">
                                    <Icon name="Check" className="w-8 h-8 text-sky-500" />
                                </div>
                                <span className="text-sky-800 font-bold text-sm">Alhamdulillah</span>
                                <span className="text-sky-600 text-xs mt-1.5">Belum ada catatan tidak hadir di bulan ini.</span>
                            </div>
                        ) : (
                            filteredDetailsLogs.map(l => (
                                <div key={l.id} className="p-6 hover:bg-white transition-colors">
                                    <div className="font-bold text-sm text-sky-900">{l.jenis}</div>
                                    <div className="text-[11px] text-sky-600 mt-2 flex items-center gap-1.5 font-medium tracking-wide"><Icon name="Calendar" className="w-3.5 h-3.5" /> {fmtDate(l.tglMelanggar)}</div>
                                    {l.keterangan && <div className="mt-3 text-xs text-sky-800 bg-white p-3.5 rounded-xl border border-sky-100 italic shadow-sm">"{l.keterangan}"</div>}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            <div className="fixed bottom-6 right-0 left-0 px-5 pointer-events-none z-50 flex justify-center">
                <a href={`https://wa.me/${formatWA(sysWa)}?text=${encodeURIComponent(`Assalamu'alaikum Ustadz,\nSaya ingin menanyakan santri atas nama ${profile.nama}`)}`} target="_blank" rel="noreferrer" className="w-full max-w-md bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white p-4 rounded-2xl shadow-[0_10px_25px_rgba(37,211,102,0.4)] font-bold flex items-center justify-center gap-2 hover:shadow-[0_15px_30px_rgba(37,211,102,0.5)] hover:-translate-y-1 transition-all duration-300 pointer-events-auto border border-emerald-400/50">
                     <Icon name="WhatsApp" className="w-5 h-5" /> Hubungi Pengurus
                </a>
            </div>
        </div>
    );
}