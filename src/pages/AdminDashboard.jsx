import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { supabase } from "../supabaseClient";
import { Icon, Badge, TagFilterBar } from "../components/SharedUI";
import { ROLES, SUPER_ADMINS, BASE_URL, getDate, fmtDate, fmtTimeAgo, formatWA, generateExcel, generatePDF } from "../utils";
import GrafikPage from "../GrafikPage";
import { QRCodeCanvas } from 'qrcode.react';

const TopViolators = memo(({ logs, onSelectSantri }) => {
    const topData = useMemo(() => {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 2);
        const cutoffStr = cutoff.toISOString().split('T')[0];

        const recentLogs = logs.filter(l => l.tglMelanggar >= cutoffStr);
        const grouped = {};

        recentLogs.forEach(l => {
            if (!grouped[l.jenis]) grouped[l.jenis] = {};
            if (!grouped[l.jenis][l.nama]) grouped[l.jenis][l.nama] = 0;
            grouped[l.jenis][l.nama]++;
        });

        return Object.entries(grouped).map(([jenis, namesObj]) => {
            const topNames = Object.entries(namesObj)
                .map(([nama, count]) => ({ nama, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
            return { jenis, topNames };
        }).filter(d => d.topNames.length > 0)
          .sort((a, b) => b.topNames[0].count - a.topNames[0].count);
    }, [logs]);

    if (topData.length === 0) return null;

    return (
        <div className="mb-6 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 px-1">
                <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 p-1.5 rounded-lg shadow-sm">
                    <Icon name="TrendingUp" className="w-4 h-4" />
                </div>
                <div>
                    <h3 className="font-bold text-xs text-[var(--text-main)] uppercase tracking-wide">Top 10 Pelanggaran</h3>
                    <p className="text-[9px] text-[var(--text-muted)]">Periode 2 Bulan Terakhir</p>
                </div>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar snap-x">
                {topData.map((group, idx) => (
                    <div key={idx} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 min-w-[240px] max-w-[280px] shrink-0 snap-start shadow-sm">
                        <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2 text-[11px] uppercase border-b border-[var(--border)] pb-1.5 truncate" title={group.jenis}>
                            {group.jenis}
                        </h4>
                        <div className="space-y-1 mt-2">
                            {group.topNames.map((santri, i) => (
                                <div key={i} onClick={() => onSelectSantri(santri.nama)} className="flex justify-between items-center p-1.5 hover:bg-[var(--bg-hover)] rounded-lg cursor-pointer group transition-colors">
                                    <div className="flex items-center gap-2 truncate pr-2">
                                        <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold shrink-0 ${i === 0 ? 'bg-red-100 text-red-600' : i === 1 ? 'bg-orange-100 text-orange-600' : i === 2 ? 'bg-amber-100 text-amber-600' : 'bg-[var(--bg-input)] text-[var(--text-muted)]'}`}>
                                            {i + 1}
                                        </span>
                                        <span className="text-[10px] font-medium text-[var(--text-main)] truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {santri.nama}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-bold bg-[var(--bg-input)] group-hover:bg-white dark:group-hover:bg-[var(--bg-card)] text-[var(--text-muted)] px-1.5 py-0.5 rounded shadow-sm shrink-0 transition-colors">
                                        {santri.count}x
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

const HistoryGrid = memo(({ nama, logs, types, onExport, onDeleteAll, isAdmin }) => {
    const [currDate, setCurrDate] = useState(() => new Date());
    const changeMonth = useCallback((delta) => setCurrDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + delta); return d; }), []);
    
    const { year, month, daysInMonth, monthName, daysArray, firstDayOfWeek } = useMemo(() => {
        const year = currDate.getFullYear();
        const month = currDate.getMonth();
        return {
            year, month,
            daysInMonth: new Date(year, month + 1, 0).getDate(),
            monthName: currDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
            daysArray: Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1),
            firstDayOfWeek: new Date(year, month, 1).getDay() // Optimasi: Hitung hari sekali saja
        };
    }, [currDate]);

    const currentMonthLogs = useMemo(() => {
        const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;
        return logs.filter(l => l.tglMelanggar >= startStr && l.tglMelanggar <= endStr);
    }, [logs, year, month, daysInMonth]);

    const violationsMap = useMemo(() => {
        const map = new Map();
        currentMonthLogs.forEach(l => {
            map.set(`${l.jenis}_${l.tglMelanggar}`, l);
        });
        return map;
    }, [currentMonthLogs]);

    const dayNames = useMemo(() => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], []);

    return (
        <div className="bg-[var(--bg-card)] rounded-lg overflow-hidden border border-[var(--border)] select-none">
            <div className="flex flex-wrap justify-between items-center bg-[var(--bg-sub)] p-2 border-b border-[var(--border)] gap-y-2">
                <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                    <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition"><Icon name="Chevron" className="w-5 h-5 rotate-90" /></button>
                    <span className="font-bold text-sm text-[var(--text-accent)] uppercase tracking-wide flex-1 text-center truncate">{monthName}</span>
                    <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition"><Icon name="Chevron" className="w-5 h-5 -rotate-90" /></button>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-auto">
                    <button onClick={() => onExport(nama, logs, types, currDate, 'excel')} className="bg-emerald-600 text-white p-1.5 rounded-md hover:bg-emerald-700 transition flex items-center gap-1"><Icon name="Download" className="w-4 h-4" /><span className="hidden sm:inline text-[10px] font-bold uppercase">XLS</span></button>
                    <button onClick={() => onExport(nama, logs, types, currDate, 'pdf')} className="bg-red-600 text-white p-1.5 rounded-md hover:bg-red-700 transition flex items-center gap-1"><Icon name="FileText" className="w-4 h-4" /><span className="hidden sm:inline text-[10px] font-bold uppercase">PDF</span></button>
                    {isAdmin && <button onClick={() => onDeleteAll(nama)} className="bg-red-600 text-white p-1.5 rounded-md hover:bg-red-700 transition"><Icon name="Trash" className="w-4 h-4" /></button>}
                </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar pb-2">
                <div className="inline-block min-w-full align-middle">
                    <div className="flex border-b border-[var(--border)]">
                        <div className="sticky left-0 z-20 w-44 min-w-[11rem] bg-[var(--bg-header)] border-r border-[var(--border)] shrink-0 p-2 text-xs font-bold text-[var(--text-muted)] flex items-center">Jenis</div>
                        {daysArray.map(d => {
                            const dayName = dayNames[(firstDayOfWeek + d - 1) % 7]; // Optimasi Date
                            return (
                                <div key={d} className="h-10 min-w-[2.25rem] flex flex-col items-center justify-center border-r border-b border-[var(--border)] bg-[var(--bg-header)] text-[var(--text-muted)] w-9">
                                    <span className="text-[10px] font-bold leading-none mt-0.5">{d}</span>
                                    <span className={`text-[8px] mt-0.5 ${dayName === 'Min' ? 'text-red-500 font-bold' : ''}`}>{dayName}</span>
                                </div>
                            );
                        })}
                    </div>
                    {types.map((jenis) => (
                        <div key={jenis.id} className="flex border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)]">
                            <div className="sticky left-0 z-10 w-44 min-w-[11rem] bg-[var(--bg-card)] border-r border-[var(--border)] shrink-0 px-3 py-1 text-[11px] font-medium leading-tight flex items-center text-[var(--text-main)] shadow-sm">{jenis.nama}</div>
                            {daysArray.map(day => {
                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const violation = violationsMap.get(`${jenis.nama}_${dateStr}`);
                                let cellClass = "bg-emerald-600/5"; let content = "";
                                if (violation) { cellClass = violation.statusTazir === "Sudah" ? "bg-amber-500 text-white" : "bg-red-600 text-white shadow-inner"; content = "X"; }
                                return <div key={day} className={`h-9 min-w-[2.25rem] flex items-center justify-center border-r border-b border-[var(--border)] text-[10px] font-bold transition-colors ${cellClass} w-9`}>{content}</div>;
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

// OPTIMASI: Memisahkan Item untuk mencegah re-render list secara massal saat form/checkbox diubah
const SantriListItem = memo(({
    nama, sInfo, santriLogs, notes, prestasiItems, filterTazir, isExpanded,
    isSelected, count, onToggleExpand, onToggleSel, actions, types, isAdmin, canDelete, canTazir,
    handleExport, handleDeleteAll, noteForm, setNoteForm, prestasiForm, setPrestasiForm
}) => {
    // Memindahkan editState ke tingkat local komponen (State Colocation)
    const [editState, setEditState] = useState({ type: null, id: null, text: "" });

    const startEdit = useCallback((type, item) => setEditState({ type, id: item.id, text: type === 'note' ? item.isi : item.prestasi }), []);
    const cancelEdit = useCallback(() => setEditState({ type: null, id: null, text: "" }), []);
    const saveEdit = useCallback(() => {
        if (!editState.text.trim()) return cancelEdit();
        if (editState.type === 'note') actions.updateNote(editState.id, editState.text);
        if (editState.type === 'prestasi') actions.updatePrestasi(editState.id, editState.text);
        cancelEdit();
    }, [editState, actions, cancelEdit]);

    const items = useMemo(() => filterTazir ? santriLogs.filter(l => l.statusTazir === "Belum") : santriLogs, [santriLogs, filterTazir]);
    const historyItems = useMemo(() => !filterTazir ? santriLogs : [], [santriLogs, filterTazir]);

    return (
        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="bg-[var(--bg-header)] p-3 flex justify-between items-center cursor-pointer hover:bg-[var(--bg-hover)]" onClick={() => onToggleExpand(nama)}>
                <div className="flex-1 min-w-0 pr-2">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <div className="font-bold text-base text-[var(--text-accent)]">{nama}</div>
                        {sInfo?.labels && sInfo.labels.length > 0 && (<div className="flex flex-wrap gap-1">{sInfo.labels.map((label, idx) => (<Badge key={idx} color="indigo" className="text-[8px] px-1.5">{label}</Badge>))}</div>)}
                    </div>
                    {canDelete && isSelected && <div onClick={(e) => { e.stopPropagation(); actions.delMany(items.filter(i => isSelected).map(i => i.id)); }} className="mt-1 text-red-600 text-[10px] font-bold uppercase">🗑️ Hapus item terpilih</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`${count > 0 ? "bg-red-600" : "bg-green-600"} text-[10px] w-6 h-6 flex items-center justify-center rounded-full text-white font-bold`}>{count}</span>
                    {filterTazir && canTazir && count > 0 && <button onClick={(e) => actions.tazir(nama, e)} className="text-[10px] bg-orange-600 text-white px-2 py-1 rounded font-bold">Takzir</button>}
                    <Icon name="Chevron" className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </div>
            {isExpanded && (
                <div className="bg-[var(--bg-sub)] border-t border-[var(--border)] p-2 space-y-2">
                    {!filterTazir ? (
                        <>
                            <HistoryGrid nama={nama} logs={santriLogs} types={types} isAdmin={isAdmin} onExport={handleExport} onDeleteAll={handleDeleteAll} />
                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg mt-2 overflow-hidden">
                                <div className="p-2 bg-[var(--bg-header)] text-[10px] font-bold uppercase text-[var(--text-muted)]">Rincian Riwayat</div>
                                <div className="divide-y divide-[var(--border)] max-h-60 overflow-y-auto custom-scrollbar">
                                    {historyItems.map(l => (
                                        <div key={l.id} className="p-2 flex justify-between items-start gap-2 hover:bg-[var(--bg-sub)] border-b border-[var(--border)] last:border-0">
                                            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1"><span className="font-bold text-xs text-[var(--text-main)]">{l.jenis}</span>{l.statusTazir === 'Sudah' ? (<Badge color="green">Ditakzir {l.tazirBy || 'System'}</Badge>) : (<Badge color="red">Belum ditakzir</Badge>)}{l.keterangan && <span className="text-[10px] font-medium text-indigo-900 dark:text-indigo-100 italic bg-indigo-100/80 dark:bg-indigo-900/50 px-2 py-0.5 rounded border-l-2 border-indigo-500 w-fit">{l.keterangan}</span>}</div><div className="text-[10px] text-[var(--text-muted)] flex flex-wrap items-center gap-2"><span>{fmtDate(l.tglMelanggar)}</span>{l.inputBy && <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"><Icon name="User" className="w-2.5 h-2.5 text-slate-500" /><span className="text-[9px] font-bold text-slate-700 dark:text-slate-300">{l.inputBy}</span></div>}</div></div>
                                            {canDelete && <button onClick={() => actions.del(l.id)} className="text-[10px] text-red-600 font-bold shrink-0">Hapus</button>}
                                        </div>
                                    ))}
                                    {historyItems.length === 0 && <div className="p-3 text-center text-xs italic text-[var(--text-muted)]">Belum ada riwayat pelanggaran.</div>}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
                            <div className="p-2 bg-[var(--bg-header)] text-[10px] font-bold uppercase text-[var(--text-muted)] border-b border-[var(--border)]">Daftar Pelanggaran (Belum Takzir)</div>
                            <div className="divide-y divide-[var(--border)]">
                                {items.map(l => (
                                    <div key={l.id} className="p-2 flex justify-between items-start gap-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-sub)]">
                                        <div className="flex gap-2 flex-1 min-w-0">
                                            {canDelete && <input type="checkbox" checked={isSelected} onChange={() => onToggleSel(l.id)} className="mt-1 accent-red-600 shrink-0" />}
                                            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1"><span className="font-bold text-xs text-[var(--text-main)]">{l.jenis}</span>{l.keterangan && <span className="text-[10px] font-medium text-indigo-900 dark:text-indigo-100 italic bg-indigo-100/80 dark:bg-indigo-900/50 px-2 py-0.5 rounded border-l-2 border-indigo-500 w-fit">{l.keterangan}</span>}</div><div className="text-[10px] text-[var(--text-muted)] flex flex-wrap items-center gap-2"><span>{fmtDate(l.tglMelanggar)}</span>{l.inputBy?.trim() && <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"><Icon name="User" className="w-2.5 h-2.5 text-slate-500" /><span className="text-[9px] font-bold text-slate-700 dark:text-slate-300">{l.inputBy}</span></div>}</div></div>
                                        </div>
                                        {canDelete && <button onClick={() => actions.del(l.id)} className="text-[10px] text-red-600 font-bold shrink-0">Hapus</button>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Prestasi */}
                    <div className="bg-[var(--bg-card)] rounded border border-[var(--border)] mt-2 overflow-hidden">
                        <div className="p-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase border-b border-[var(--border)] flex items-center gap-1.5 bg-[var(--bg-header)]">
                            <Icon name="Star" className="w-3.5 h-3.5" /> Prestasi Santri:
                        </div>
                        {prestasiItems.map(p => (
                            <div key={p.id} className="flex justify-between items-start gap-3 text-xs p-2 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)]">
                                {editState.type === 'prestasi' && editState.id === p.id ? (
                                    <div className="flex-1 flex gap-2">
                                        <input autoFocus type="text" className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs" value={editState.text} onChange={e => setEditState({...editState, text: e.target.value})} />
                                        <button onClick={saveEdit} className="text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded"><Icon name="Check" className="w-3.5 h-3.5"/></button>
                                        <button onClick={cancelEdit} className="text-red-500 font-bold bg-red-50 dark:bg-red-900/30 p-1.5 rounded"><Icon name="X" className="w-3.5 h-3.5"/></button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="break-words min-w-0 flex-1 font-medium">{p.prestasi}</span>
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => startEdit('prestasi', p)} className="text-blue-500 hover:text-blue-700 transition"><Icon name="Edit" className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => actions.delPrestasi(p.id)} className="text-red-500 hover:text-red-700 transition"><Icon name="Trash" className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        <div className="p-2 flex gap-2 bg-[var(--bg-sub)]">
                            <input type="text" className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs" value={prestasiForm} onChange={e => setPrestasiForm(e.target.value)} placeholder="Masukkan prestasi santri..." />
                            <button onClick={() => actions.addPrestasi(nama)} className="bg-emerald-600 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm flex items-center gap-1.5"><Icon name="Check" className="w-3 h-3" /> Tambah</button>
                        </div>
                    </div>

                    {/* Catatan */}
                    <div className="bg-[var(--bg-note)] rounded border border-[var(--border)] mt-2">
                        <div className="p-2 text-[10px] font-bold text-amber-600 uppercase border-b border-[var(--border)] bg-[var(--bg-header)]">Catatan:</div>
                        {notes.map(n => (
                            <div key={n.id} className="flex justify-between items-start gap-3 text-xs p-2 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)]">
                                {editState.type === 'note' && editState.id === n.id ? (
                                    <div className="flex-1 flex gap-2">
                                        <input autoFocus type="text" className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs" value={editState.text} onChange={e => setEditState({...editState, text: e.target.value})} />
                                        <button onClick={saveEdit} className="text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded"><Icon name="Check" className="w-3.5 h-3.5"/></button>
                                        <button onClick={cancelEdit} className="text-red-500 font-bold bg-red-50 dark:bg-red-900/30 p-1.5 rounded"><Icon name="X" className="w-3.5 h-3.5"/></button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="break-words min-w-0 flex-1">{n.isi}</span>
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => startEdit('note', n)} className="text-blue-500 hover:text-blue-700 transition"><Icon name="Edit" className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => actions.delNote(n.id)} className="text-red-500 hover:text-red-700 transition"><Icon name="Trash" className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        <div className="p-2 flex gap-2 bg-[var(--bg-sub)]">
                            <input type="text" className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs" value={noteForm} onChange={e => setNoteForm(e.target.value)} placeholder="Tambahkan catatan khusus..." />
                            <button onClick={() => actions.addNote(nama)} className="bg-amber-600 text-white px-3 py-1 rounded text-[10px] font-bold shadow-sm flex items-center gap-1.5"><Icon name="Check" className="w-3 h-3" /> Tambah</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom Comparison: Jika tidak di-expand sekarang dan sebelumnya, abaikan pengecekan dalam untuk optimalisasi render
    if (!prevProps.isExpanded && !nextProps.isExpanded) {
        return prevProps.count === nextProps.count 
            && prevProps.sInfo === nextProps.sInfo
            && prevProps.isSelected === nextProps.isSelected;
    }
    return false; // Delegasikan deep checking ke default React.memo jika diexpand
});

const SantriList = memo(({ filterTazir, groupedLogs, groupedNotes, groupedPrestasi, expanded, setExpanded, role, actions, noteForm, setNoteForm, prestasiForm, setPrestasiForm, types, searchQuery, santriData, filterTags, sortMode }) => {
    const isAdmin = role === ROLES.ADMIN;
    const canDelete = role === ROLES.ADMIN;
    const canTazir = [ROLES.ADMIN, ROLES.PENTAKZIR].includes(role);
    const [selectedIds, setSelectedIds] = useState([]);

    const santriMap = useMemo(() => {
        const map = new Map();
        santriData.forEach(s => map.set(s.nama, s));
        return map;
    }, [santriData]);

    const list = useMemo(() => {
        let filtered = santriData.map(s => s.nama);
        
        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            filtered = filtered.filter(nama => {
                const sData = santriMap.get(nama);
                return nama.toLowerCase().includes(lowerQ) || 
                       ((groupedLogs[nama] || []).some(l => l.jenis.toLowerCase().includes(lowerQ))) || 
                       (sData?.labels?.some(t => t.toLowerCase().includes(lowerQ)));
            });
        }
        if (filterTazir) {
            filtered = filtered.filter(n => (groupedLogs[n] || []).some(l => l.statusTazir === "Belum"));
        }
        if (filterTags && filterTags.length > 0) { 
            filtered = filtered.filter(nama => { 
                const sData = santriMap.get(nama); 
                return sData?.labels && filterTags.every(tag => sData.labels.includes(tag)); 
            }); 
        }
        
        return filtered.sort((a, b) => {
            if (sortMode === 'count') {
                const countA = filterTazir ? (groupedLogs[a] || []).filter(l => l.statusTazir === 'Belum').length : (groupedLogs[a] || []).length;
                const countB = filterTazir ? (groupedLogs[b] || []).filter(l => l.statusTazir === 'Belum').length : (groupedLogs[b] || []).length;
                if (countA !== countB) return countB - countA;
            }
            return a.localeCompare(b);
        });
    }, [santriData, groupedLogs, filterTazir, searchQuery, filterTags, santriMap, sortMode]);

    const toggleSel = useCallback((id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]), []);
    const toggleExpand = useCallback((nama) => setExpanded(p => ({ ...p, [nama]: !p[nama] })), [setExpanded]);
    
    const handleExport = useCallback((nama, logs, exportTypes, currDate, format = 'excel') => {
        if (format === 'pdf') {
            generatePDF(nama, logs, exportTypes, currDate);
        } else {
            generateExcel(nama, logs, exportTypes, currDate);
        }
    }, []);
    
    const handleDeleteAll = useCallback((nama) => actions.delAll(nama), [actions]);

    if (!list.length) return <div className="text-center text-[var(--text-muted)] mt-10 text-sm">Tidak ada data.</div>;

    return (
        <div className="space-y-3 pb-1">
            {list.map(nama => {
                const santriLogs = groupedLogs[nama] || [];
                return (
                    <SantriListItem 
                        key={nama}
                        nama={nama}
                        sInfo={santriMap.get(nama)}
                        santriLogs={santriLogs}
                        notes={groupedNotes[nama] || []}
                        prestasiItems={groupedPrestasi[nama] || []}
                        filterTazir={filterTazir}
                        isExpanded={expanded[nama]}
                        isSelected={santriLogs.some(l => selectedIds.includes(l.id))}
                        count={santriLogs.filter(l => l.statusTazir === "Belum").length}
                        onToggleExpand={toggleExpand}
                        onToggleSel={toggleSel}
                        actions={actions}
                        types={types}
                        isAdmin={isAdmin}
                        canDelete={canDelete}
                        canTazir={canTazir}
                        handleExport={handleExport}
                        handleDeleteAll={handleDeleteAll}
                        noteForm={noteForm}
                        setNoteForm={setNoteForm}
                        prestasiForm={prestasiForm}
                        setPrestasiForm={setPrestasiForm}
                    />
                );
            })}
        </div>
    );
});

// Komponen Pembantu Batch Santri Row
const BatchSantriItem = memo(({ s, isSelected, onToggleSel, onEdit, onDel, isAdmin }) => (
    <div className="p-2 flex justify-between items-center text-xs hover:bg-[var(--bg-hover)] transition-colors">
        <div className="flex items-center gap-2 w-full pr-2">
            {isAdmin && (<input type="checkbox" checked={isSelected} onChange={() => onToggleSel(s.id)} className="accent-blue-600 shrink-0 w-3.5 h-3.5" />)}
            <div className="flex flex-col gap-1 w-full cursor-pointer" onClick={() => onEdit(s)}>
                <div className="flex items-center gap-2"><span className="font-medium">{s.nama}</span><div className="flex gap-0.5">{s.labels && s.labels.slice(0, 3).map((t, i) => (<div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400" title={t}></div>))}{s.labels && s.labels.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>}</div></div>
            </div>
        </div>
        <div className="flex gap-2 items-center shrink-0">
            <button onClick={() => onEdit(s)} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded transition"><Icon name="Edit" className="w-4 h-4" /></button>
            {isAdmin && <button onClick={() => onDel(s.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded transition"><Icon name="Trash" className="w-4 h-4" /></button>}
        </div>
    </div>
));

const BatchUsers = memo(({ users, pending, types, allTags, onDel, onApprove, onReject, onUpdateUser, onAddManual }) => {
    const [pendingRoles, setPendingRoles] = useState({});
    const [showManual, setShowManual] = useState(false);
    const [manualForm, setManualForm] = useState({ email: "", nickname: "", role: ROLES.PETUGAS });
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [tempTypes, setTempTypes] = useState([]);
    const [tempTags, setTempTags] = useState([]);
    const [tempRole, setTempRole] = useState("");
    const [tempNickname, setTempNickname] = useState("");
    const [historyModal, setHistoryModal] = useState(null);
    const [loadingHist, setLoadingHist] = useState(false);

    const openEdit = useCallback((u) => { setEditingAssignment(u); setTempTypes(u.assignedTypes || []); setTempTags(u.assignedTags || []); setTempRole(u.role); setTempNickname(u.nickname || ""); }, []);
    const toggleType = useCallback((tName) => { setTempTypes(prev => prev.includes(tName) ? prev.filter(x => x !== tName) : [...prev, tName]); }, []);
    const toggleAllTypes = useCallback(() => { setTempTypes(prev => prev.length === types.length ? [] : types.map(t => t.nama)); }, [types]);
    const toggleTag = useCallback((tagName) => { setTempTags(prev => prev.includes(tagName) ? prev.filter(x => x !== tagName) : [...prev, tagName]); }, []);
    const toggleAllTags = useCallback(() => { setTempTags(prev => prev.length === allTags.length ? [] : [...allTags]); }, [allTags]);
    const saveEdit = useCallback(() => { if (editingAssignment) { const finalTypes = tempRole === ROLES.PETUGAS ? tempTypes : []; onUpdateUser(editingAssignment.id, finalTypes, tempRole, tempNickname, tempTags); setEditingAssignment(null); } }, [editingAssignment, onUpdateUser, tempRole, tempNickname, tempTags, tempTypes]);
    const openHistory = useCallback(async (user) => { setLoadingHist(true); try { const { data, error } = await supabase.from('activity_logs').select('*').eq('email', user.email).order('created_at', { ascending: false }).limit(30); if (error) throw error; setHistoryModal({ user, logs: data || [] }); } catch (e) { alert("Gagal memuat history."); console.error(e); } finally { setLoadingHist(false); } }, []);

    return (
        <div className="space-y-4">
            <button onClick={() => setShowManual(!showManual)} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase shadow-sm">{showManual ? "Batal Tambah" : "+ Tambah Member Manual"}</button>
            {showManual && (
                <div className="bg-[var(--bg-card)] border-2 border-blue-500/30 p-3 rounded-lg space-y-3">
                    <input type="email" placeholder="Email Google Member" className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={manualForm.email} onChange={e => setManualForm({ ...manualForm, email: e.target.value })} />
                    <input type="text" placeholder="Nama Panggilan" className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={manualForm.nickname} onChange={e => setManualForm({ ...manualForm, nickname: e.target.value })} />
                    <select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs font-bold" value={manualForm.role} onChange={e => setManualForm({ ...manualForm, role: e.target.value })}>
                        <option value={ROLES.PETUGAS}>Level: Petugas Absen</option>
                        <option value={ROLES.PENTAKZIR}>Level: Pentakzir</option>
                        <option value={ROLES.WALI_KELAS}>Level: Wali Kelas</option>
                        <option value={ROLES.ADMIN}>Level: Admin</option>
                    </select>
                    <button onClick={() => { onAddManual(manualForm); setShowManual(false); setManualForm({ email: "", nickname: "", role: ROLES.PETUGAS }); }} className="w-full bg-green-600 text-white py-2 rounded font-bold text-xs uppercase">Simpan Member</button>
                </div>
            )}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] overflow-hidden">
                <div className="p-2 bg-[var(--bg-sub)] text-[10px] font-bold uppercase">Member Aktif & Aktivitas</div>
                {users.slice().sort((a, b) => { const dateA = a.last_seen ? new Date(a.last_seen) : new Date(0); const dateB = b.last_seen ? new Date(b.last_seen) : new Date(0); return dateB - dateA; }).map(u => {
                    const lastSeenDate = u.last_seen ? new Date(u.last_seen) : null; const isInactive = lastSeenDate ? (new Date() - lastSeenDate) > (24 * 60 * 60 * 1000) : true;
                    return (
                        <div key={u.id} className="p-3">
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-start"><div className="min-w-0 flex-1 pr-2"><div className="text-xs font-bold truncate">{u.nickname}</div><div className="text-[9px] opacity-60 truncate">{u.email}</div></div><div className={`shrink-0 w-2.5 h-2.5 rounded-full ${isInactive ? 'bg-red-500' : 'bg-green-500 animate-pulse'} border border-[var(--bg-card)] shadow-sm`} title={isInactive ? "Offline > 24 Jam" : "Online / Baru aktif"} /></div>
                                <div className="flex justify-between items-center pt-2 border-t border-[var(--border)] border-dashed">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${u.role === ROLES.ADMIN ? 'bg-red-100 text-red-600' : u.role === ROLES.PENTAKZIR ? 'bg-purple-100 text-purple-600' : u.role === ROLES.WALI_KELAS ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>{u.role}</span>
                                    <div className="flex gap-1">
                                        <button onClick={() => openHistory(u)} className="text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-1.5 rounded-md transition border border-amber-200 dark:border-amber-800" title="Timeline">{loadingHist ? <span className="animate-spin h-3.5 w-3.5 block border-2 border-amber-600 border-t-transparent rounded-full"></span> : <Icon name="Clock" className="w-3.5 h-3.5" />}</button>
                                        {!SUPER_ADMINS.includes(u.email) && (
                                            <>
                                                <button onClick={() => openEdit(u)} className="text-blue-600 bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-md transition border border-blue-200 dark:border-blue-800" title="Edit"><Icon name="Edit" className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => { if (window.confirm(`Yakin ingin menghapus ${u.nickname}?`)) onDel(u.id); }} className="text-red-600 bg-red-50 dark:bg-red-900/30 p-1.5 rounded-md transition border border-red-200 dark:border-red-800"><Icon name="Trash" className="w-3.5 h-3.5" /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-2 bg-[var(--bg-sub)] p-2 rounded border border-[var(--border)] flex items-start gap-2"><Icon name="Activity" className="w-3 h-3 text-[var(--text-muted)] mt-0.5" /><div className="flex-1"><div className="text-[9px] font-bold text-[var(--text-accent)]">{lastSeenDate ? fmtTimeAgo(u.last_seen) : "Belum login"}</div><div className="text-[9px] text-[var(--text-muted)] italic line-clamp-1">Terakhir: {u.last_action || "-"}</div></div></div>
                            {u.role === ROLES.PETUGAS && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                    <span className="text-[8px] text-gray-500 dark:text-gray-400 mr-1 mt-0.5">Tugas:</span>
                                    {u.assignedTypes && u.assignedTypes.length > 0 ? u.assignedTypes.map((t, idx) => (<span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[8px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{t}</span>)) : <span className="text-[8px] text-red-400 italic">Belum ada tugas</span>}
                                </div>
                            )}
                            {u.role !== ROLES.ADMIN && u.assignedTags && u.assignedTags.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                    <span className="text-[8px] text-gray-500 dark:text-gray-400 mr-1 mt-0.5">Label:</span>
                                    {u.assignedTags.map((t, idx) => (<span key={idx} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[8px] px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-700">{t}</span>))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {editingAssignment && (
                <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-[var(--bg-card)] w-full max-w-sm rounded-xl p-4 shadow-2xl border border-[var(--border)] max-h-[85vh] flex flex-col">
                        <div className="flex justify-between items-center mb-3 border-b border-[var(--border)] pb-2"><h3 className="font-bold text-sm">Edit Member</h3><button onClick={() => setEditingAssignment(null)} className="text-red-500 font-bold">✕</button></div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="mb-3"><label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Nama Panggilan</label><input type="text" className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs mt-1" value={tempNickname} onChange={e => setTempNickname(e.target.value)} /></div>
                            <div className="mb-3">
                                <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Level / Role</label>
                                <select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs font-bold mt-1" value={tempRole} onChange={e => setTempRole(e.target.value)}>
                                    <option value={ROLES.PETUGAS}>Petugas Absen</option>
                                    <option value={ROLES.PENTAKZIR}>Pentakzir</option>
                                    <option value={ROLES.WALI_KELAS}>Wali Kelas</option>
                                    <option value={ROLES.ADMIN}>Admin</option>
                                </select>
                            </div>
                            {tempRole !== ROLES.ADMIN && (
                                <>
                                    <div className="flex justify-between items-center mb-1 mt-3">
                                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Batas Tag/Label ({tempTags.length})</span>
                                        <button onClick={toggleAllTags} className="text-[10px] text-blue-600 font-bold underline">{tempTags.length === allTags.length ? "Hapus Semua" : "Pilih Semua"}</button>
                                    </div>
                                    <div className="overflow-y-auto space-y-1 pr-1 custom-scrollbar max-h-24 mb-3 p-2 bg-[var(--bg-sub)] rounded border border-[var(--border)]">
                                        {allTags.length === 0 && <div className="text-[10px] italic text-[var(--text-muted)]">Belum ada label/tag.</div>}
                                        {allTags.map(t => (
                                            <label key={t} className="flex items-center gap-2 text-xs cursor-pointer">
                                                <input type="checkbox" checked={tempTags.includes(t)} onChange={() => toggleTag(t)} className="accent-blue-600" />
                                                {t}
                                            </label>
                                        ))}
                                    </div>
                                </>
                            )}
                            {tempRole === ROLES.PETUGAS && (
                                <>
                                    <div className="flex justify-between items-center mb-1 mt-3">
                                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Tugas Input ({tempTypes.length})</span>
                                        <button onClick={toggleAllTypes} className="text-[10px] text-blue-600 font-bold underline">{tempTypes.length === types.length ? "Hapus Semua" : "Pilih Semua"}</button>
                                    </div>
                                    <div className="overflow-y-auto space-y-1 pr-1 custom-scrollbar max-h-24 p-2 bg-[var(--bg-sub)] rounded border border-[var(--border)]">
                                        {types.map(t => (
                                            <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                                <input type="checkbox" checked={tempTypes.includes(t.nama)} onChange={() => toggleType(t.nama)} className="accent-blue-600" />
                                                {t.nama}
                                            </label>
                                        ))}
                                    </div>
                                </>
                            )}
                            {tempRole === ROLES.ADMIN && (<div className="p-4 text-center bg-[var(--bg-sub)] rounded border border-[var(--border)] mb-4"><p className="text-xs text-[var(--text-muted)] italic">Level <b>Admin</b> memiliki hak akses sistem secara penuh tanpa batasan.</p></div>)}
                        </div>
                        <div className="mt-3 pt-3 border-t border-[var(--border)] flex gap-2"><button onClick={() => setEditingAssignment(null)} className="flex-1 py-2 rounded bg-gray-200 text-gray-800 text-xs font-bold">Batal</button><button onClick={saveEdit} className="flex-1 py-2 rounded bg-blue-600 text-white text-xs font-bold">Simpan</button></div>
                    </div>
                </div>
            )}
            {historyModal && (
                <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-[var(--bg-card)] w-full max-w-sm rounded-xl p-0 shadow-2xl border border-[var(--border)] max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-[var(--border)] bg-[var(--bg-sub)] flex justify-between items-center"><div><h3 className="font-bold text-xs uppercase text-[var(--text-accent)]">Timeline Aktivitas</h3><p className="text-[10px] text-[var(--text-muted)]">User: <b>{historyModal.user.nickname}</b></p></div><button onClick={() => setHistoryModal(null)} className="p-1 hover:bg-[var(--bg-hover)] rounded"><Icon name="X" className="w-5 h-5" /></button></div>
                        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar divide-y divide-[var(--border)]">{historyModal.logs.length === 0 ? (<div className="p-6 text-center text-[var(--text-muted)] text-xs italic">Belum ada data history terekam.</div>) : (historyModal.logs.map((log) => (<div key={log.id} className="p-3 hover:bg-[var(--bg-hover)] transition-colors"><div className="flex items-start gap-3"><div className="flex flex-col items-center gap-1 min-w-[3rem]"><span className="text-[10px] font-bold text-[var(--text-muted)]">{new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span><span className="text-[9px] text-[var(--text-muted)] opacity-70">{new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div><div className="flex-1 border-l-2 border-blue-500/20 pl-3 py-0.5"><div className="text-xs font-medium leading-tight">{log.action}</div></div></div></div>)))}</div>
                    </div>
                </div>
            )}
            {pending.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-lg overflow-hidden">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-[10px] font-bold uppercase text-amber-700">Permintaan Akses Baru</div>
                    <div className="divide-y divide-amber-200">
                        {pending.map(p => (
                            <div key={p.id} className="p-3">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-xs">
                                        <div className="font-bold text-[var(--text-main)]">{p.nickname}</div>
                                        <div className="text-[10px] opacity-70">{p.email}</div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${p.role === ROLES.PENTAKZIR ? 'bg-purple-100 text-purple-700' : p.role === ROLES.WALI_KELAS ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>Minta: {p.role}</span>
                                </div>
                                <div className="text-[10px] bg-white/50 dark:bg-black/20 p-2 rounded border border-amber-200 mb-2">
                                    <div className="font-bold text-amber-800 dark:text-amber-50 mb-0.5">Batas Tag/Label:</div>
                                    <div className="italic text-gray-600 dark:text-gray-400 mb-1">{p.assignedTags?.length > 0 ? p.assignedTags.join(", ") : "Semua Label/Tag (Default)"}</div>
                                    {p.role === ROLES.PETUGAS && (
                                        <>
                                            <div className="font-bold text-amber-800 dark:text-amber-50 mb-0.5 mt-2">Tugas yang dipilih:</div>
                                            <div className="italic text-gray-600 dark:text-gray-400">{p.assignedTypes?.length > 0 ? p.assignedTypes.join(", ") : "Tidak memilih tugas"}</div>
                                        </>
                                    )}
                                </div>
                                <div className="flex gap-2 items-center">
                                    <select className="flex-1 text-[10px] border border-amber-300 rounded p-1 bg-white" value={pendingRoles?.[p.id] || p.role || ROLES.PETUGAS} onChange={(e) => setPendingRoles({ ...pendingRoles, [p.id]: e.target.value })}>
                                        <option value={ROLES.PETUGAS}>Setujui sbg: Petugas</option>
                                        <option value={ROLES.PENTAKZIR}>Setujui sbg: Pentakzir</option>
                                        <option value={ROLES.WALI_KELAS}>Setujui sbg: Wali Kelas</option>
                                        <option value={ROLES.ADMIN}>Setujui sbg: Admin</option>
                                    </select>
                                    <button onClick={() => onApprove(p, pendingRoles?.[p.id] || p.role || ROLES.PETUGAS)} className="bg-green-600 text-white px-3 py-1 rounded text-[10px] font-bold">Terima</button>
                                    <button onClick={() => onReject(p.id)} className="bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold">Tolak</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

const BatchSantri = memo(({ santri, form, setForm, edit, setEdit, onAdd, onUpdate, onDel, onDelMany, isAdmin }) => {
    const [tagInput, setTagInput] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);

    const filteredSantri = useMemo(() => { 
        if (!form) return santri; 
        const query = form.toLowerCase();
        return santri.filter(s => 
            s.nama.toLowerCase().includes(query) || 
            (s.labels && s.labels.some(t => t.toLowerCase().includes(query)))
        ); 
    }, [santri, form]);

    const addTag = useCallback(() => { if (!tagInput.trim() || !edit) return; const currentTags = edit.labels || []; if (!currentTags.includes(tagInput.trim())) setEdit({ ...edit, labels: [...currentTags, tagInput.trim()] }); setTagInput(""); }, [tagInput, edit, setEdit]);
    const removeTag = useCallback((tag) => { if (!edit) return; setEdit({ ...edit, labels: edit.labels.filter(t => t !== tag) }); }, [edit, setEdit]);
    const toggleSel = useCallback((id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]), []);
    const toggleSelectAll = useCallback(() => { setSelectedIds(prev => prev.length === filteredSantri.length ? [] : filteredSantri.map(s => s.id)); }, [filteredSantri]);
    const onEditCallback = useCallback((s) => setEdit({ ...s, labels: s.labels || [] }), [setEdit]);
    
    return (
        <div className="space-y-4 flex flex-col h-full">
            <div className="flex gap-2 flex-none">
                <input type="text" className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs" placeholder={edit ? "Edit Nama/Tag..." : "Cari Santri / Tag..."} value={edit ? edit.nama : form} onChange={e => edit ? setEdit({ ...edit, nama: e.target.value }) : setForm(e.target.value)} disabled={edit && !isAdmin} />
                {!edit && isAdmin && (<button onClick={onAdd} className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold uppercase shadow-sm whitespace-nowrap">+</button>)}
            </div>
            {!edit && isAdmin && filteredSantri.length > 0 && (
                <div className="flex justify-between items-center bg-[var(--bg-sub)] p-2 border border-[var(--border)] rounded flex-none">
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-[var(--text-main)]">
                        <input type="checkbox" checked={selectedIds.length === filteredSantri.length && filteredSantri.length > 0} onChange={toggleSelectAll} className="accent-blue-600 w-3.5 h-3.5" />
                        Pilih Semua ({filteredSantri.length})
                    </label>
                    {selectedIds.length > 0 && (
                        <button onClick={() => { onDelMany(selectedIds); setSelectedIds([]); }} className="bg-red-600 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase shadow-sm">Hapus {selectedIds.length}</button>
                    )}
                </div>
            )}
            {edit && (
                <div className="bg-[var(--bg-sub)] p-3 rounded-lg border border-[var(--border)] space-y-3 flex-none">
                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Edit Data & Label</span><button onClick={() => setEdit(null)} className="text-red-500 font-bold text-xs">Batal</button></div>
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">{edit.labels && edit.labels.length > 0 ? (edit.labels.map(tag => (<span key={tag} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full text-[10px] border border-indigo-200 dark:border-indigo-800">{tag}<button onClick={() => removeTag(tag)} className="hover:text-red-500 font-bold ml-1">×</button></span>))) : (<span className="text-[10px] text-[var(--text-muted)] italic">Belum ada label/tag.</span>)}</div>
                        <div className="flex gap-2"><input type="text" className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs" placeholder="Tambah Label (Contoh: Kamar A, Kelas 2)..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} /><button onClick={addTag} className="bg-indigo-600 text-white px-3 py-1 rounded text-[10px] font-bold">Add Tag</button></div>
                    </div>
                    <button onClick={onUpdate} className="w-full bg-blue-600 text-white py-2 rounded text-xs font-bold uppercase shadow-sm">Simpan Perubahan</button>
                </div>
            )}
            <div className="flex-1 overflow-y-auto border border-[var(--border)] rounded divide-y divide-[var(--border)] bg-[var(--bg-card)] custom-scrollbar">
                {filteredSantri.length === 0 && (<div className="p-4 text-center text-[var(--text-muted)] text-xs italic">Tidak ada santri ditemukan.</div>)}
                {filteredSantri.map(s => (
                    <BatchSantriItem key={s.id} s={s} isSelected={selectedIds.includes(s.id)} onToggleSel={toggleSel} onEdit={onEditCallback} onDel={onDel} isAdmin={isAdmin} />
                ))}
            </div>
        </div>
    );
});

const BatchJenis = memo(({ jenis, form, setForm, edit, setEdit, onAdd, onUpdate, onDel }) => {
    const filteredJenis = useMemo(() => {
        if (!form && !edit) return jenis;
        const query = edit ? edit.nama : form;
        if (!query) return jenis;
        return jenis.filter(j => j.nama.toLowerCase().includes(query.toLowerCase()));
    }, [jenis, form, edit]);

    return (
        <div className="space-y-4 flex flex-col h-full">
            <div className="flex gap-2 flex-none">
                <input type="text" className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs" placeholder={edit ? "Edit Jenis Pelanggaran..." : "Tambah/Cari Jenis..."} value={edit ? edit.nama : form} onChange={e => edit ? setEdit({ ...edit, nama: e.target.value }) : setForm(e.target.value)} />
                {!edit && (<button onClick={onAdd} className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold uppercase shadow-sm whitespace-nowrap">Tambah</button>)}
            </div>
            {edit && (
                <div className="bg-[var(--bg-sub)] p-3 rounded-lg border border-[var(--border)] space-y-3">
                    <div className="flex justify-between items-center"><span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Edit Jenis Pelanggaran</span><button onClick={() => setEdit(null)} className="text-red-500 font-bold text-xs">Batal</button></div>
                    <button onClick={onUpdate} className="w-full bg-blue-600 text-white py-2 rounded text-xs font-bold uppercase shadow-sm">Simpan Perubahan</button>
                </div>
            )}
            <div className="flex-1 overflow-y-auto border border-[var(--border)] rounded divide-y divide-[var(--border)] bg-[var(--bg-card)] custom-scrollbar">
                {filteredJenis.length === 0 && (<div className="p-4 text-center text-[var(--text-muted)] text-xs italic">Tidak ada data.</div>)}
                {filteredJenis.map(j => (
                    <div key={j.id} className="p-2 flex justify-between items-center text-xs hover:bg-[var(--bg-hover)] transition-colors">
                        <span className="font-medium flex-1 cursor-pointer" onClick={() => setEdit(j)}>{j.nama}</span>
                        <div className="flex gap-2 items-center">
                            <button onClick={() => setEdit(j)} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded transition"><Icon name="Edit" className="w-4 h-4" /></button>
                            <button onClick={() => onDel(j.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded transition"><Icon name="Trash" className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

const BatchTools = memo(({ types, searchState, setSearch, onSearch, result, selected, setSelected, target, setTarget, onExec, rangeForm, setRangeForm, onMigrate }) => {
    const [mode, setMode] = useState("daily");
    return (
        <div className="space-y-4">
            <div className="flex rounded-lg bg-[var(--bg-input)] p-1 border border-[var(--border)]">
                <button onClick={() => setMode("daily")} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition ${mode === 'daily' ? 'bg-white text-blue-600 shadow' : 'text-[var(--text-muted)]'}`}>Koreksi Harian</button>
                <button onClick={() => setMode("range")} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition ${mode === 'range' ? 'bg-white text-blue-600 shadow' : 'text-[var(--text-muted)]'}`}>Migrasi Range</button>
            </div>
            {mode === 'daily' ? (
                <div className="space-y-4">
                    <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border)]"><h4 className="text-[10px] font-bold uppercase mb-2 text-[var(--text-muted)]">Cari Pelanggaran Harian</h4><div className="flex flex-col gap-2"><input type="date" className="bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-2 text-xs" value={searchState.date} onChange={e => setSearch(p => ({ ...p, date: e.target.value }))} /><select className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-2 text-xs" value={searchState.jenis} onChange={e => setSearch(p => ({ ...p, jenis: e.target.value }))}><option value="">Pilih Pelanggaran...</option>{types.map(t => <option key={t.id} value={t.nama}>{t.nama}</option>)}</select><button onClick={onSearch} className="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold uppercase">Cari Data</button></div></div>
                    {result.length > 0 && (<div className="space-y-2"><div className="max-h-40 overflow-y-auto border border-[var(--border)] rounded p-2 bg-[var(--bg-sub)] custom-scrollbar">{result.map(r => <label key={r.id} className="flex items-center gap-2 text-xs py-1"><input type="checkbox" checked={selected.includes(r.id)} onChange={() => setSelected(p => p.includes(r.id) ? p.filter(x => x !== r.id) : [...p, r.id])} />{r.nama}</label>)}</div><div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-200 grid grid-cols-1 gap-2"><span className="text-[10px] font-bold text-amber-700 uppercase">Aksi Massal:</span><input type="date" className="bg-white border rounded px-2 py-2 text-xs text-black" value={target.newDate} onChange={e => setTarget(p => ({ ...p, newDate: e.target.value }))} /><select className="bg-white border rounded px-2 py-2 text-xs text-black" value={target.newJenis} onChange={e => setTarget(p => ({ ...p, newJenis: e.target.value }))}>{types.map(t => <option key={t.id} value={t.nama}>{t.nama}</option>)}</select><div className="grid grid-cols-2 gap-2 mt-1"><button onClick={() => onExec('update')} className="bg-green-600 text-white py-2 rounded text-[10px] font-bold uppercase">Update</button><button onClick={() => onExec('delete')} className="bg-red-600 text-white py-2 rounded text-[10px] font-bold uppercase">Hapus</button></div></div></div>)}
                </div>
            ) : (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 rounded-lg space-y-3"><h4 className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Pindah Data Masal (Range Tanggal)</h4><div className="grid grid-cols-2 gap-2"><input type="date" className="bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={rangeForm.start} onChange={e => setRangeForm(p => ({ ...p, start: e.target.value }))} /><input type="date" className="bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={rangeForm.end} onChange={e => setRangeForm(p => ({ ...p, end: e.target.value }))} /></div><select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={rangeForm.oldJenis} onChange={e => setRangeForm(p => ({ ...p, oldJenis: e.target.value }))}><option value="">Pilih Pelanggaran Lama...</option>{types.map(j => <option key={j.id} value={j.nama}>{j.nama}</option>)}</select><select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={rangeForm.newJenis} onChange={e => setRangeForm(p => ({ ...p, newJenis: e.target.value }))}><option value="">Pilih Pelanggaran Baru...</option>{types.map(j => <option key={j.id} value={j.nama}>{j.nama}</option>)}</select><button onClick={onMigrate} className="w-full bg-amber-600 text-white py-3 rounded-lg font-bold text-xs uppercase shadow-md">Eksekusi Migrasi Data</button></div>
            )}
        </div>
    );
});

const BatchDanger = memo(({ bulkDelForm, setBulkDelForm, onExec, loading }) => {
    const setStart = useCallback((e) => setBulkDelForm(p => ({ ...p, start: e.target.value })), [setBulkDelForm]);
    const setEnd = useCallback((e) => setBulkDelForm(p => ({ ...p, end: e.target.value })), [setBulkDelForm]);

    return (
        <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 p-3 rounded-lg">
                <h3 className="text-red-600 font-bold uppercase text-[10px] mb-2">Hapus Logs Berdasarkan Range Tanggal</h3>
                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <input type="date" className="flex-1 min-w-0 bg-white border border-red-200 rounded px-2 py-2 text-xs text-black" value={bulkDelForm.start} onChange={setStart} />
                    <input type="date" className="flex-1 min-w-0 bg-white border border-red-200 rounded px-2 py-2 text-xs text-black" value={bulkDelForm.end} onChange={setEnd} />
                </div>
                <button onClick={onExec} className="w-full bg-red-600 text-white py-2 rounded font-bold text-xs shadow-sm">{loading ? "MENGHAPUS..." : "HAPUS PERMANEN"}</button>
            </div>
        </div>
    );
});

// Component Wrapper untuk mencegah render ulang satu list
const WaliAccessItem = memo(({ s, publicLink, waMode, copyToClipboardLink, openWhatsAppWithMessage, downloadQRImage }) => (
    <div className="bg-[var(--bg-sub)] border border-[var(--border)] rounded p-1.5 flex items-center gap-2 hover:bg-[var(--bg-hover)] transition-colors">
        <div className="flex-1 min-w-0 pr-1 border-r border-[var(--border)] border-dashed"><div className="font-bold text-[11px] text-[var(--text-accent)] truncate">{s.nama}</div><div className="flex flex-wrap gap-0.5 mt-0.5">{s.labels?.slice(0, 2).map(l => <span key={l} className="text-[8px] bg-[var(--bg-card)] border border-[var(--border)] px-1 py-0.5 rounded">{l}</span>)}{s.labels?.length > 2 && <span className="text-[8px] opacity-60">..</span>}</div></div>
        <div className="flex items-center gap-1 shrink-0">
            {!waMode ? (
                <><input type="text" readOnly value={publicLink} className="bg-[var(--bg-input)] border border-[var(--border)] text-[9px] px-1.5 py-1 rounded w-32 text-[var(--text-muted)] outline-none" /><button onClick={() => copyToClipboardLink(publicLink)} className="p-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:opacity-80 transition-opacity" title="Salin Link"><Icon name="Link" className="w-3.5 h-3.5" /></button></>
            ) : (
                <><button onClick={() => openWhatsAppWithMessage(s.nama, publicLink)} className="px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded hover:opacity-80 transition-opacity flex items-center gap-1.5 text-[10px] font-bold" title="Kirim Pesan ke WA"><Icon name="WhatsApp" className="w-3.5 h-3.5" /> KIRIM</button><button onClick={() => downloadQRImage(s.id, s.nama, publicLink)} className="px-2.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded hover:opacity-80 transition-opacity flex items-center gap-1.5 text-[10px] font-bold" title="Unduh QR Code"><Icon name="Download" className="w-3.5 h-3.5" /> QR</button></>
            )}
        </div>
        <div className="hidden"><QRCodeCanvas id={`qr-${s.id}`} value={publicLink} size={250} level={"H"} /></div>
    </div>
));

const BatchWaliAccess = memo(({ santri, allUniqueTags }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTags, setSelectedTags] = useState([]);
    const [waMode, setWaMode] = useState(false);
    const [visibleCount, setVisibleCount] = useState(15); 

    const toggleTag = useCallback((tag) => { setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]); }, []);
    useEffect(() => { setVisibleCount(15); }, [searchQuery, selectedTags, waMode]);

    const filteredSantri = useMemo(() => {
        const lowerQ = searchQuery.toLowerCase();
        return santri.filter(s => {
            const matchSearch = s.nama.toLowerCase().includes(lowerQ);
            const matchTag = selectedTags.length === 0 || (s.labels && selectedTags.every(tag => s.labels.includes(tag)));
            return matchSearch && matchTag;
        });
    }, [santri, searchQuery, selectedTags]);

    const copyToClipboardLink = useCallback((text) => { navigator.clipboard.writeText(text); window.alert("Link disalin!"); }, []);
    const getFullWAMessage = useCallback((nama, link) => `Assalamu’alaikum warahmatullahi wabarakatuh.\nBapak/Ibu Wali Santri ${nama} yang kami hormati,\nBapak/Ibu dapat memantau kehadiran dan aktivitas Ananda ${nama} di pesantren melalui link / QR code yang kami kirimkan. \n\nSilahkan klik link berikut:\n${link}\natau scan QR code untuk mengakses absensi tersebut.\n\nJazakumullahu khairan atas perhatian dan kerja samanya.\nWassalamu’alaikum warahmatullahi wabarakatuh.`, []);
    const openWhatsAppWithMessage = useCallback((nama, publicLink) => { window.open(`https://wa.me/?text=${encodeURIComponent(getFullWAMessage(nama, publicLink))}`, '_blank'); }, [getFullWAMessage]);
    const copyBulkLinks = useCallback(() => { if (filteredSantri.length === 0) return window.alert("Tidak ada data."); const text = filteredSantri.map(s => `${s.nama}: ${BASE_URL}/?wali=${s.id}`).join('\n'); navigator.clipboard.writeText(text).then(() => { window.alert(`${filteredSantri.length} Link disalin!`); }); }, [filteredSantri]);
    const copyBulkWA = useCallback(() => { if (filteredSantri.length === 0) return window.alert("Tidak ada data."); const text = filteredSantri.map(s => getFullWAMessage(s.nama, `${BASE_URL}/?wali=${s.id}`)).join('\n\n--------------------------------------------------\n\n'); navigator.clipboard.writeText(text).then(() => { window.alert(`${filteredSantri.length} Pesan WA disalin!`); }); }, [filteredSantri, getFullWAMessage]);
    const downloadQRImage = useCallback((id, nama, link) => { const qrCanvas = document.getElementById(`qr-${id}`); if (!qrCanvas) return window.alert("QR Code belum termuat."); const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const padding = 30; const qrSize = qrCanvas.width; canvas.width = qrSize + (padding * 2); canvas.height = qrSize + (padding * 2) + 100; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.font = 'bold 20px Arial, sans-serif'; ctx.fillStyle = '#1e293b'; ctx.textAlign = 'center'; ctx.fillText(nama, canvas.width / 2, padding + 10); ctx.font = '12px Arial, sans-serif'; ctx.fillStyle = '#64748b'; ctx.fillText("Scan untuk melihat absensi", canvas.width / 2, padding + 30); ctx.drawImage(qrCanvas, padding, padding + 45); ctx.font = '11px Courier New, monospace'; ctx.fillStyle = '#2563eb'; ctx.fillText(link, canvas.width / 2, canvas.height - 25); const url = canvas.toDataURL('image/png'); const a = document.createElement('a'); a.href = url; a.download = `QR_Absensi_${nama.replace(/\s+/g, '_')}.png`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }, []);

    return (
        <div className="flex flex-col h-full w-full min-h-0 bg-[var(--bg-card)]">
            <div className="flex flex-col gap-1.5 flex-none p-1.5 pb-2 border-b border-[var(--border)]">
                <div className="relative"><Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" /><input type="text" className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded pl-7.5 pr-2 py-1.5 text-[11px]" placeholder="" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                <div className="flex items-center"><span className="text-[9px] text-[var(--text-muted)] mr-1.5 shrink-0">Tags:</span><div className="flex gap-0.5 overflow-x-auto no-scrollbar pb-0.5 custom-scrollbar">{allUniqueTags.map(tag => (<button key={tag} onClick={() => toggleTag(tag)} className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-colors shrink-0 whitespace-nowrap ${selectedTags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-[var(--bg-sub)] text-[var(--text-muted)] border-[var(--border)] hover:border-indigo-400'}`}>{tag}</button>))}</div>{selectedTags.length > 0 && <button onClick={() => setSelectedTags([])} className="text-[9px] text-red-500 font-bold ml-1.5 shrink-0">Batal</button>}</div>
                <div className="flex rounded-md bg-[var(--bg-input)] p-0.5 border border-[var(--border)] mt-0.5"><button onClick={() => setWaMode(false)} className={`flex-1 py-1 text-[9px] font-bold uppercase rounded transition ${!waMode ? 'bg-white text-blue-600 shadow dark:bg-zinc-700 dark:text-blue-400' : 'text-[var(--text-muted)]'}`}>Link</button><button onClick={() => setWaMode(true)} className={`flex-1 py-1 text-[9px] font-bold uppercase rounded transition ${waMode ? 'bg-white text-green-600 shadow dark:bg-zinc-700 dark:text-green-400' : 'text-[var(--text-muted)]'}`}><Icon name="WhatsApp" className="w-2.5 h-2.5 inline-block mr-1 -mt-0.5" />Pesan WA</button></div>
                {!waMode ? (<button onClick={copyBulkLinks} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded text-[10px] transition-colors shadow-sm">COPY SEMUA LINK</button>) : (<button onClick={copyBulkWA} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 rounded text-[10px] transition-colors shadow-sm flex items-center justify-center gap-1.5"><Icon name="WhatsApp" className="w-3.5 h-3.5" /> COPY PESAN WA</button>)}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 min-h-0">
                <div className="space-y-1">
                    {filteredSantri.slice(0, visibleCount).map(s => (
                        <WaliAccessItem key={s.id} s={s} publicLink={`${BASE_URL}/?wali=${s.id}`} waMode={waMode} copyToClipboardLink={copyToClipboardLink} openWhatsAppWithMessage={openWhatsAppWithMessage} downloadQRImage={downloadQRImage} />
                    ))}
                    {visibleCount < filteredSantri.length && (<button onClick={() => setVisibleCount(v => v + 25)} className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 rounded text-[10px] font-bold transition-colors mt-1.5">Muat Lebih Banyak...</button>)}
                    {filteredSantri.length === 0 && <div className="text-center py-6 text-[var(--text-muted)] text-[10px] italic bg-[var(--bg-sub)] rounded border border-[var(--border)]">Tidak ditemukan</div>}
                </div>
            </div>
        </div>
    );
});

const BatchSystem = memo(({ bulkDelForm, setBulkDelForm, restoreFile, setRestoreFile, onExec, loading, crud, catatanData }) => {
    const sysWaData = catatanData.find(c => c.nama === 'SYSTEM_WA');
    const [waInput, setWaInput] = useState(sysWaData ? sysWaData.isi : "");
    useEffect(() => { setWaInput(sysWaData ? sysWaData.isi : ""); }, [sysWaData]);

    const handlePickContact = async () => {
        if ('contacts' in navigator && 'ContactsManager' in window) {
            try {
                const props = ['tel']; const contacts = await navigator.contacts.select(props, { multiple: false });
                if (contacts && contacts.length > 0 && contacts[0].tel && contacts[0].tel.length > 0) {
                    let phone = contacts[0].tel[0].replace(/\D/g, ''); 
                    if(phone.startsWith('62')) phone = '0' + phone.substring(2);
                    setWaInput(phone);
                }
            } catch (ex) { /* Cancelled */ }
        } else { window.alert("Fitur pilih kontak belum didukung di browser perangkat ini."); }
    };

    return (
        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="bg-[var(--bg-sub)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400">Nomor WA Pengurus</h3>
                <div className="flex gap-2">
                    <input type="text" value={waInput} onChange={e => setWaInput(e.target.value)} placeholder="Contoh: 08123456789" className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-xs" />
                    <button onClick={handlePickContact} className="shrink-0 bg-emerald-600 text-white px-3 py-2 rounded-lg shadow-sm flex items-center justify-center transition-colors hover:bg-emerald-700" title="Pilih dari Kontak HP"><Icon name="User" className="w-4 h-4" /></button>
                    <button onClick={() => crud.updateSysWa(waInput)} className="shrink-0 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-sm flex items-center justify-center transition-colors hover:bg-blue-700" title="Simpan Nomor"><Icon name="Save" className="w-4 h-4" /></button>
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">Nomor WhatsApp ini akan dihubungi otomatis melalui Dashboard Wali Santri.</p>
            </div>
            <div className="bg-[var(--bg-sub)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase text-cyan-700">Backup & Restore</h3>
                <button onClick={crud.backup} className="w-full bg-cyan-700 text-white font-bold py-3 rounded-lg text-xs uppercase shadow-sm">Download Backup (JSON)</button>
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
                    <input type="file" accept=".json" onChange={e => setRestoreFile(e.target.files[0])} className="text-[10px]" />
                    <button onClick={crud.processRestore} disabled={!restoreFile} className="bg-teal-600 text-white font-bold py-3 rounded-lg text-xs uppercase disabled:opacity-50 shadow-sm">Restore Data</button>
                </div>
            </div>
            <BatchDanger bulkDelForm={bulkDelForm} setBulkDelForm={setBulkDelForm} onExec={onExec} loading={loading} />
        </div>
    );
});

export default memo(function AdminDashboard({ ctx }) {
    const {
        ui, setUi, data, forms, setForms, crud,
        allUniqueTags, allowedSantriByTag, groupedLogs, groupedNotes, groupedPrestasi,
        inputTypes, toggleFilterTag, handleLogout,
        expanded, setExpanded, dailyRes, handleDailySelected,
        handleSetNoteForm, handleSetPrestasiForm, handleSetDailySearch, handleSetBatchTarget,
        handleSetRangeForm, handleSetSantri, handleSetEditSantri,
        handleSetJenisInput, handleSetEditJenis, handleSetBulkDelForm,
        handleSetRestoreFile, handleBulkDelExec
    } = ctx;

    const isAdmin = ui.role === ROLES.ADMIN;

    return (
        <div className="h-[100dvh] bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col overflow-hidden" onClick={() => setUi(p => ({ ...p, menu: false }))}>
            <div className="flex-none bg-[var(--bg-header)] px-3 py-2 border-b border-[var(--border)] flex justify-between items-center h-12 z-[60]">
                <h1 className="text-sm font-bold text-[var(--text-accent)] uppercase tracking-wide">Absensi Santri</h1>
                <div className="flex gap-1 relative items-center">
                    <button onClick={(e) => { e.stopPropagation(); setUi(p => ({ ...p, fontSize: (p.fontSize + 1) % 3 })); }} className="p-1.5 hover:bg-[var(--bg-hover)] rounded font-bold text-[10px] w-8 h-8 flex items-center justify-center border border-[var(--border)] mr-1" title="Ubah Ukuran Font">A<span className="text-[8px] align-top">A</span></button>
                    <button onClick={(e) => { e.stopPropagation(); setUi(p => ({ ...p, dark: !p.dark })); localStorage.setItem("theme", !ui.dark ? "dark" : "light"); }} className="p-1.5 text-yellow-500 hover:bg-[var(--bg-hover)] rounded"><Icon name={ui.dark ? "Moon" : "Sun"} className="w-5 h-5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); setUi(p => ({ ...p, menu: !p.menu })); }} className="rounded-full overflow-hidden border border-[var(--border)] w-8 h-8 ml-1 focus:ring-2 focus:ring-blue-500 transition-all">
                        {ui.user?.user_metadata?.avatar_url ? (<img src={ui.user.user_metadata.avatar_url} referrerPolicy="no-referrer" alt="User" className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center bg-[var(--bg-sub)]"><Icon name="Menu" className="w-5 h-5" /></div>)}
                    </button>
                    {ui.menu && (
                        <div className="absolute right-0 top-10 w-56 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl py-2 z-[70]">
                            {['grafik', 'database'].filter(t => !(ui.role === ROLES.WALI_KELAS && t === 'grafik')).map(t => (
                                <button key={t} onClick={() => setUi(p => ({ ...p, tab: t, batchMode: ui.role === ROLES.WALI_KELAS ? 'wali' : 'users' }))} className="w-full text-left px-5 py-3 capitalize text-sm hover:bg-[var(--bg-hover)]">
                                    {t === 'database' ? (isAdmin ? 'Admin Panel' : (ui.role === ROLES.WALI_KELAS ? 'Akses Wali' : 'Data Santri')) : t}
                                </button>
                            ))}
                            <button onClick={handleLogout} className="w-full text-left px-5 py-3 text-sm font-bold border-t border-[var(--border)] hover:bg-[var(--bg-hover)]">Logout</button>
                        </div>
                    )}
                </div>
            </div>

            {ui.toast && <div className="fixed top-14 inset-x-0 z-[100] flex justify-center pointer-events-none"><div className="bg-green-600 text-white px-5 py-2 rounded-full shadow-lg text-xs font-bold animate-bounce">{ui.toast}</div></div>}

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {ui.role && ui.tab === "input" && ui.role !== ROLES.WALI_KELAS ? (
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)] flex flex-col h-full shadow-sm gap-3">
                            <div className="bg-amber-100 dark:bg-amber-900/40 border-l-4 border-amber-50 text-amber-900 dark:text-amber-200 p-3 rounded shadow-sm text-xs font-medium flex items-start gap-2 animate-pulse">
                                <span className="text-amber-600 dark:text-amber-400 text-base shrink-0 leading-none">⚠️</span>
                                <span><b className="uppercase">Panduan Penting:</b> Silakan <b>KLIK</b> pada nama santri yang <b>TIDAK HADIR</b> atau <b>MELANGGAR</b>. Santri yang hadir/tertib tidak perlu Anda klik.</span>
                            </div>

                            <div className="flex flex-col gap-2 flex-none">
                                <select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all" value={forms.input.jenis} onChange={e => setForms(p => ({ ...p, input: { ...p.input, jenis: e.target.value } }))}><option value="">-- Pilih Pelanggaran --</option>{inputTypes.map(j => (<option key={j.id} value={j.nama}>{j.nama}</option>))}</select>
                                <div className="relative w-full"><div className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-medium flex justify-between items-center text-[var(--text-main)]"><span>{fmtDate(forms.input.date)}</span><Icon name="Calendar" className="w-4 h-4 text-[var(--text-muted)]" /></div><input type="date" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value={forms.input.date} onChange={e => setForms(p => ({ ...p, input: { ...p.input, date: e.target.value } }))} /></div>
                            </div>
                            <div className="relative flex-none"><Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" /><input type="text" className="w-full bg-[var(--bg-sub)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2.5 text-xs placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-input)] transition-colors outline-none" placeholder="Cari Santri..." value={forms.inputSearch} onChange={e => setForms(p => ({ ...p, inputSearch: e.target.value }))} /></div>
                            <div className="flex-1 bg-[var(--bg-sub)]/30 rounded-lg border border-[var(--border)] p-2 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 content-start gap-2 custom-scrollbar">
                                {allowedSantriByTag.filter(s => {
                                    const query = (forms.inputSearch || "").toLowerCase();
                                    return s.nama.toLowerCase().includes(query) || (s.labels && s.labels.some(t => t.toLowerCase().includes(query)));
                                }).map(s => { const isSelected = forms.input.students.includes(s.nama); return (<div key={s.id} onClick={() => setForms(p => ({ ...p, input: { ...p.input, students: isSelected ? p.input.students.filter(x => x !== s.nama) : [...p.input.students, s.nama] } }))} className={`px-2 py-1.5 rounded-lg text-[10px] text-center transition-all cursor-pointer select-none border flex items-center justify-center font-medium ${isSelected ? "bg-blue-600 text-white font-bold border-blue-600 shadow-md transform scale-[1.02]" : "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-main)] hover:border-blue-400 hover:bg-[var(--bg-hover)]"}`}>{s.nama}</div>); })}
                                {allowedSantriByTag.length > 0 && allowedSantriByTag.filter(s => s.nama.toLowerCase().includes((forms.inputSearch || "").toLowerCase()) || (s.labels && s.labels.some(t => t.toLowerCase().includes((forms.inputSearch || "").toLowerCase())))).length === 0 && (<div className="col-span-full text-center text-[var(--text-muted)] text-[10px] py-10 italic">Santri tidak ditemukan</div>)}
                            </div>
                            <div className="flex-none pt-2 border-t border-[var(--border)] flex flex-col gap-2"><div className="flex gap-2 w-full"><input className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Catatan (Opsional)..." value={forms.input.keterangan} onChange={e => setForms(p => ({ ...p, input: { ...p.input, keterangan: e.target.value } }))} /><button onClick={crud.save} className="flex-none shrink-0 bg-blue-600 text-white w-14 rounded-lg font-bold text-xs shadow hover:bg-blue-700 active:scale-[0.98] transition-transform flex items-center justify-center gap-1" title="Simpan Data"><Icon name="Save" className="w-5 h-5" /><span className="text-sm">{forms.input.students.length > 0 ? forms.input.students.length : ''}</span></button></div></div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">
                        {(ui.tab === "takziran" || ui.tab === "riwayat") && (ui.role !== ROLES.WALI_KELAS || ui.tab === "riwayat") && (
                            <>
                                <div className="flex-none p-4 pb-2 z-20 bg-[var(--bg-main)]">
                                    <div className="flex gap-2 mb-2">
                                        <div className="relative flex-1">
                                            <input type="text" className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-full px-10 py-2.5 text-xs shadow-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none" placeholder="Cari Santri / Label..." value={forms.search} onChange={e => setForms(p => ({ ...p, search: e.target.value }))} />
                                            <Icon name="Search" className="absolute left-4 top-1/2 -translate-y-2 w-4 h-4 text-[var(--text-muted)]" />
                                            {forms.search && <button onClick={() => setForms(p => ({ ...p, search: "" }))} className="absolute right-4 top-1/2 -translate-y-2 text-red-500 font-bold text-xs">✕</button>}
                                        </div>
                                        <button onClick={() => setForms(p => ({ ...p, sortMode: p.sortMode === 'count' ? 'alpha' : 'count' }))} className="shrink-0 bg-[var(--bg-card)] border border-[var(--border)] px-4 rounded-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)] hover:text-blue-600 transition-colors shadow-sm">
                                            <Icon name="List" className="w-3.5 h-3.5" />
                                            {forms.sortMode === 'count' ? 'Terbanyak' : 'A-Z'}
                                        </button>
                                    </div>
                                    <TagFilterBar tags={allUniqueTags} selected={forms.filterTags} toggle={toggleFilterTag} />
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pt-0">
                                    {ui.tab === 'riwayat' && !forms.search && (!forms.filterTags || forms.filterTags.length === 0) && (
                                        <TopViolators logs={data.logs} onSelectSantri={(nama) => {
                                            setForms(p => ({ ...p, search: nama, sortMode: 'alpha' }));
                                            setExpanded(p => ({ ...p, [nama]: true }));
                                        }} />
                                    )}
                                    <SantriList
                                        filterTazir={ui.tab === "takziran"} groupedLogs={groupedLogs} groupedNotes={groupedNotes} groupedPrestasi={groupedPrestasi}
                                        expanded={expanded} setExpanded={setExpanded} role={ui.role} searchQuery={forms.search}
                                        actions={crud} noteForm={forms.note} setNoteForm={handleSetNoteForm}
                                        prestasiForm={forms.prestasiForm} setPrestasiForm={handleSetPrestasiForm} types={data.jenis}
                                        santriData={allowedSantriByTag} filterTags={forms.filterTags} sortMode={forms.sortMode}
                                    />
                                </div>
                            </>
                        )}
                        {ui.tab === "grafik" && ui.role !== ROLES.WALI_KELAS && (
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <GrafikPage fullLogs={data.logs} startDate={forms.filter.start} endDate={forms.filter.end} setStartDate={v => setForms(p => ({ ...p, filter: { ...p.filter, start: v } }))} setEndDate={v => setForms(p => ({ ...p, filter: { ...p.filter, end: v } }))} isDark={ui.dark} />
                            </div>
                        )}
                        {ui.tab === "database" && (
                            <div className="flex flex-col h-full p-4 overflow-hidden">
                                {isAdmin && (
                                    <div className="grid grid-cols-3 sm:grid-cols-6 text-[10px] font-bold border-b border-[var(--border)] bg-[var(--bg-sub)] rounded-t-xl overflow-hidden flex-none">
                                        {[{ id: 'users', l: 'MEMBER' }, { id: 'tools', l: 'TOOLS' }, { id: 'santri', l: 'SANTRI' }, { id: 'jenis', l: 'JENIS' }, { id: 'wali', l: 'AKSES WALI' }, { id: 'system', l: 'SISTEM' }].map(m => (
                                            <button key={m.id} onClick={() => setUi(p => ({ ...p, batchMode: m.id }))} className={`py-3 transition-all text-center border-r border-b sm:border-b-0 border-[var(--border)] ${ui.batchMode === m.id ? "text-blue-600 bg-[var(--bg-card)] border-b-2 border-b-blue-600 sm:border-b-blue-600" : "text-[var(--text-muted)]"}`}>{m.l} {m.id === 'users' && data.pendingUsers.length > 0 ? "(!)" : ""}</button>
                                        ))}
                                    </div>
                                )}
                                {ui.role === ROLES.WALI_KELAS && !isAdmin && (
                                    <div className="text-[12px] font-bold border-b border-[var(--border)] bg-[var(--bg-sub)] rounded-t-xl p-3 text-center text-blue-600 flex-none tracking-widest uppercase">
                                        Halaman Akses Wali Santri
                                    </div>
                                )}

                                <div className={`p-2 flex-1 overflow-hidden flex flex-col border border-[var(--border)] bg-[var(--bg-card)] ${(isAdmin || ui.role === ROLES.WALI_KELAS) ? 'border-t-0 rounded-b-xl' : 'rounded-xl'}`}>
                                    {(ui.batchMode === "users" && isAdmin) && <div className="flex-1 overflow-y-auto custom-scrollbar"><BatchUsers users={data.users} pending={data.pendingUsers} types={data.jenis} allTags={allUniqueTags} onDel={crud.delMember} onApprove={crud.approveUser} onReject={crud.rejectUser} onUpdateUser={crud.updateUser} onAddManual={crud.addManualUser} /></div>}
                                    {(ui.batchMode === "tools" && isAdmin) && <div className="flex-1 overflow-y-auto custom-scrollbar"><BatchTools types={data.jenis} searchState={forms.daily} setSearch={handleSetDailySearch} onSearch={crud.searchDaily} result={dailyRes.list} selected={dailyRes.selected} setSelected={handleDailySelected} target={forms.batchTarget} setTarget={handleSetBatchTarget} onExec={crud.updateBatch} rangeForm={forms.range} setRangeForm={handleSetRangeForm} onMigrate={crud.migrateRange} /></div>}
                                    {(!isAdmin && ui.role !== ROLES.WALI_KELAS) || (isAdmin && ui.batchMode === "santri") ? (
                                        <>
                                            {!isAdmin && <div className="p-3 mb-2 bg-[var(--bg-sub)] text-[var(--text-muted)] text-[10px] rounded border border-[var(--border)] italic">Anda dapat mengedit label/tag pada nama santri.</div>}
                                            <BatchSantri santri={allowedSantriByTag} form={forms.santri} setForm={handleSetSantri} edit={forms.editSantri} setEdit={handleSetEditSantri} onAdd={crud.addSantri} onUpdate={crud.updateSantri} onDel={crud.deleteSantri} onDelMany={crud.deleteManySantri} isAdmin={isAdmin} />
                                        </>
                                    ) : null}
                                    {(ui.batchMode === "jenis" && isAdmin) && (
                                        <BatchJenis jenis={data.jenis} form={forms.jenisInput} setForm={handleSetJenisInput} edit={forms.editJenis} setEdit={handleSetEditJenis} onAdd={crud.addJenis} onUpdate={crud.updateJenis} onDel={crud.deleteJenis} />
                                    )}
                                    {((ui.batchMode === "wali" && isAdmin) || (ui.role === ROLES.WALI_KELAS)) && (
                                        <BatchWaliAccess santri={allowedSantriByTag} allUniqueTags={ui.role === ROLES.WALI_KELAS ? (ui.dbUser?.assignedTags || allUniqueTags) : allUniqueTags} />
                                    )}
                                    {(ui.batchMode === "system" && isAdmin) && (
                                        <BatchSystem bulkDelForm={forms.bulkDel} setBulkDelForm={handleSetBulkDelForm} restoreFile={forms.restoreFile} setRestoreFile={handleSetRestoreFile} onExec={handleBulkDelExec} loading={ui.loading} crud={crud} catatanData={data.catatan} />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {ui.role && (
                <div className="flex-none bg-[var(--bg-header)]/90 backdrop-blur-md border-t border-[var(--border)] flex justify-around items-center h-[56px] z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    {ui.role !== ROLES.WALI_KELAS && (
                        <>
                            <button onClick={() => setUi(p => ({ ...p, tab: 'input' }))} className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${ui.tab === 'input' ? "text-blue-600" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}><div className={`p-1 rounded-full ${ui.tab === 'input' ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}><Icon name="Pen" className="w-5 h-5" strokeWidth={ui.tab === 'input' ? "2.5" : "2"} /></div><span className="text-[9px] font-bold mt-0.5 tracking-wide">Input</span></button>
                            <button onClick={() => setUi(p => ({ ...p, tab: 'takziran' }))} className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${ui.tab === 'takziran' ? "text-blue-600" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}><div className={`p-1 rounded-full ${ui.tab === 'takziran' ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}><Icon name="Tools" className="w-5 h-5" strokeWidth={ui.tab === 'takziran' ? "2.5" : "2"} /></div><span className="text-[9px] font-bold mt-0.5 tracking-wide">Takziran</span></button>
                        </>
                    )}
                    
                    <button onClick={() => setUi(p => ({ ...p, tab: 'riwayat' }))} className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${ui.tab === 'riwayat' ? "text-blue-600" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}><div className={`p-1 rounded-full ${ui.tab === 'riwayat' ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}><Icon name="List" className="w-5 h-5" strokeWidth={ui.tab === 'riwayat' ? "2.5" : "2"} /></div><span className="text-[9px] font-bold mt-0.5 tracking-wide">Riwayat</span></button>
                    
                    {ui.role === ROLES.WALI_KELAS && (
                        <button onClick={() => setUi(p => ({ ...p, tab: 'database', batchMode: 'wali' }))} className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${ui.tab === 'database' ? "text-blue-600" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}><div className={`p-1 rounded-full ${ui.tab === 'database' ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}><Icon name="Database" className="w-5 h-5" strokeWidth={ui.tab === 'database' ? "2.5" : "2"} /></div><span className="text-[9px] font-bold mt-0.5 tracking-wide">Akses Wali</span></button>
                    )}
                </div>
            )}
        </div>
    );
});