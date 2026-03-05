import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { supabase } from "./supabaseClient";
import GrafikPage from "./GrafikPage";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// --- KONSTANTA & UTILS (Dipisah agar tidak memberatkan render) ---
const SUPER_ADMINS = ["daruttauhidpotroyudan@gmail.com", "ma2n13@gmail.com"];
const ROLES = { ADMIN: 'admin', PENTAKZIR: 'pentakzir', PETUGAS: 'petugas_absen' };

// Utility functions murni
const getDate = (d = new Date()) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
const fmtDate = (d) => new Date(d).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "short", day: "numeric" });
const fmtTimeAgo = (dateString) => {
    if (!dateString) return "Belum pernah aktif";
    const d = new Date(dateString);
    return d.toLocaleString("id-ID", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// --- KOMPONEN ICON & UI ---
const GoogleLogo = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const Icon = memo(({ name, className, ...props }) => {
    const paths = {
        Chevron: "M19 9l-7 7-7-7",
        Menu: "M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z",
        Sun: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
        Moon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
        Edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
        Search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
        Download: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
        Trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
        Check: "M5 13l4 4L19 7",
        X: "M6 18L18 6M6 6l12 12",
        Tools: "M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z",
        Clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
        User: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
        List: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
        Pen: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
        Activity: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
        Save: "M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zm-5 16a2 2 0 110-4 2 2 0 010 4zm3-10H9V5h6v4z",
        Calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
        FontSize: "M4 6h16M4 12h16M4 18H7",
        Tag: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 8V3c0-1.105.895-2 2-2z",
        Database: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
    };
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={paths[name]} />
        </svg>
    );
});

const Badge = memo(({ children, color = "blue", className }) => {
    const colors = {
        blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
        gray: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
        red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800"
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${colors[color] || colors.gray} ${className}`}>{children}</span>;
});

// --- EXCEL EXPORT ---
const generateExcel = async (nama, logs, types, currentDate = new Date()) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Riwayat Pelanggaran');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStr = currentDate.toLocaleString('id-ID', { month: 'long' });
    
    // Setup Header
    sheet.columns = [{ key: 'jenis', width: 35 }, ...Array.from({ length: daysInMonth }, (_, i) => ({ key: `d${i + 1}`, width: 4 }))];
    sheet.mergeCells(1, 1, 1, daysInMonth + 1);
    const titleRow = sheet.getCell(1, 1);
    titleRow.value = `${nama} | ${monthStr} ${year}`;
    titleRow.font = { bold: true, size: 14 };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Table Header
    const headerRow = sheet.getRow(2);
    headerRow.values = ['Jenis Pelanggaran', ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Fill Data
    const currentMonthLogs = logs.filter(l => { const d = new Date(l.tglMelanggar); return d.getMonth() === month && d.getFullYear() === year; });
    types.forEach(type => {
        const rowData = Array(daysInMonth + 1).fill(null);
        rowData[0] = type.nama;
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            if (currentMonthLogs.some(l => l.jenis === type.nama && l.tglMelanggar === dateStr)) rowData[i] = "X";
        }
        const row = sheet.addRow(rowData);
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if (colNumber > 1) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                if (cell.value === "X") {
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    const dayIndex = colNumber - 1;
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayIndex).padStart(2, '0')}`;
                    const v = currentMonthLogs.find(l => l.jenis === type.nama && l.tglMelanggar === dateStr);
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: (v && v.statusTazir === "Sudah") ? 'FFF59E0B' : 'FFDC2626' } };
                }
            } else cell.alignment = { vertical: 'middle', wrapText: true };
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Riwayat_${nama}_${monthStr}_${year}.xlsx`);
};

// --- SUB-COMPONENTS ---
const HistoryGrid = memo(({ nama, logs, types, onExport, onDeleteAll, isAdmin }) => {
    const [currDate, setCurrDate] = useState(() => new Date());
    const changeMonth = useCallback((delta) => setCurrDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + delta); return d; }), []);
    
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
        <div className="bg-[var(--bg-card)] rounded-lg overflow-hidden border border-[var(--border)] select-none">
            <div className="flex flex-wrap justify-between items-center bg-[var(--bg-sub)] p-2 border-b border-[var(--border)] gap-y-2">
                <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                    <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition"><Icon name="Chevron" className="w-5 h-5 rotate-90" /></button>
                    <span className="font-bold text-sm text-[var(--text-accent)] uppercase tracking-wide flex-1 text-center truncate">{monthName}</span>
                    <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition"><Icon name="Chevron" className="w-5 h-5 -rotate-90" /></button>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-auto">
                    <button onClick={() => onExport(currDate)} className="bg-emerald-600 text-white p-1.5 rounded-md hover:bg-emerald-700 transition flex items-center gap-1"><Icon name="Download" className="w-4 h-4" /><span className="hidden sm:inline text-[10px] font-bold uppercase">XLS</span></button>
                    {isAdmin && <button onClick={onDeleteAll} className="bg-red-600 text-white p-1.5 rounded-md hover:bg-red-700 transition"><Icon name="Trash" className="w-4 h-4" /></button>}
                </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar pb-2">
                <div className="inline-block min-w-full align-middle">
                    <div className="flex border-b border-[var(--border)]">
                        <div className="sticky left-0 z-20 w-44 min-w-[11rem] bg-[var(--bg-header)] border-r border-[var(--border)] shrink-0 p-2 text-xs font-bold text-[var(--text-muted)] flex items-center">Jenis</div>
                        {daysArray.map(d => (<div key={d} className="h-9 min-w-[2.25rem] flex items-center justify-center border-r border-b border-[var(--border)] text-[10px] font-bold bg-[var(--bg-header)] text-[var(--text-muted)] w-9">{d}</div>))}
                    </div>
                    {types.map((jenis) => (
                        <div key={jenis.id} className="flex border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)]">
                            <div className="sticky left-0 z-10 w-44 min-w-[11rem] bg-[var(--bg-card)] border-r border-[var(--border)] shrink-0 px-3 py-1 text-[11px] font-medium leading-tight flex items-center text-[var(--text-main)] shadow-sm">{jenis.nama}</div>
                            {daysArray.map(day => {
                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const violation = currentMonthLogs.find(l => l.jenis === jenis.nama && l.tglMelanggar === dateStr);
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

const SantriList = memo(({ filterTazir, groupedLogs, groupedNotes, expanded, setExpanded, role, actions, noteForm, setNoteForm, types, searchQuery, santriData, filterTags }) => {
    const isAdmin = role === ROLES.ADMIN;
    const canDelete = role === ROLES.ADMIN;
    const canTazir = [ROLES.ADMIN, ROLES.PENTAKZIR].includes(role);
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Memoized filtering logic
    const list = useMemo(() => {
        let filtered = Object.keys(groupedLogs);
        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            filtered = filtered.filter(nama => {
                const sData = santriData.find(s => s.nama === nama);
                return nama.toLowerCase().includes(lowerQ) || groupedLogs[nama].some(l => l.jenis.toLowerCase().includes(lowerQ)) || sData?.labels?.some(t => t.toLowerCase().includes(lowerQ));
            });
        }
        if (filterTazir) filtered = filtered.filter(n => groupedLogs[n].some(l => l.statusTazir === "Belum"));
        if (filterTags && filterTags.length > 0) { filtered = filtered.filter(nama => { const sData = santriData.find(s => s.nama === nama); return sData?.labels && filterTags.every(tag => sData.labels.includes(tag)); }); }
        return filtered.sort();
    }, [groupedLogs, filterTazir, searchQuery, filterTags, santriData]);

    const toggleSel = useCallback((id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]), []);
    const toggleExpand = useCallback((nama) => setExpanded(p => ({ ...p, [nama]: !p[nama] })), [setExpanded]);

    if (!list.length) return <div className="text-center text-[var(--text-muted)] mt-10 text-sm">Tidak ada data.</div>;

    return (
        <div className="space-y-3 pb-1">
            {list.map(nama => {
                const items = filterTazir ? groupedLogs[nama].filter(l => l.statusTazir === "Belum") : groupedLogs[nama];
                const historyItems = !filterTazir ? groupedLogs[nama] : [];
                const notes = groupedNotes[nama] || [];
                const sel = items.filter(i => selectedIds.includes(i.id)).map(i => i.id);
                const count = groupedLogs[nama].filter(l => l.statusTazir === "Belum").length;
                const sInfo = santriData.find(s => s.nama === nama);
                return (
                    <div key={nama} className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] overflow-hidden shadow-sm">
                        <div className="bg-[var(--bg-header)] p-3 flex justify-between items-center cursor-pointer hover:bg-[var(--bg-hover)]" onClick={() => toggleExpand(nama)}>
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                    <div className="font-bold text-base text-[var(--text-accent)]">{nama}</div>
                                    {sInfo?.labels && sInfo.labels.length > 0 && (<div className="flex flex-wrap gap-1">{sInfo.labels.map((label, idx) => (<Badge key={idx} color="indigo" className="text-[8px] px-1.5">{label}</Badge>))}</div>)}
                                </div>
                                {canDelete && sel.length > 0 && <div onClick={(e) => { e.stopPropagation(); actions.delMany(sel); setSelectedIds([]); }} className="mt-1 text-red-600 text-[10px] font-bold uppercase">🗑️ Hapus {sel.length} item</div>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`${count > 0 ? "bg-red-600" : "bg-green-600"} text-[10px] w-6 h-6 flex items-center justify-center rounded-full text-white font-bold`}>{count}</span>
                                {filterTazir && canTazir && count > 0 && <button onClick={(e) => actions.tazir(nama, e)} className="text-[10px] bg-orange-600 text-white px-2 py-1 rounded font-bold">Takzir</button>}
                                <Icon name="Chevron" className={`w-5 h-5 transition-transform ${expanded[nama] ? 'rotate-180' : ''}`} />
                            </div>
                        </div>
                        {expanded[nama] && (
                            <div className="bg-[var(--bg-sub)] border-t border-[var(--border)] p-2 space-y-2">
                                {!filterTazir ? (
                                    <>
                                        <HistoryGrid nama={nama} logs={groupedLogs[nama]} types={types} isAdmin={isAdmin} onExport={(currDate) => generateExcel(nama, groupedLogs[nama], types, currDate)} onDeleteAll={() => actions.delAll(nama)} />
                                        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg mt-2 overflow-hidden">
                                            <div className="p-2 bg-[var(--bg-header)] text-[10px] font-bold uppercase text-[var(--text-muted)]">Rincian Riwayat</div>
                                            <div className="divide-y divide-[var(--border)] max-h-60 overflow-y-auto">
                                                {historyItems.map(l => (
                                                    <div key={l.id} className="p-2 flex justify-between items-start gap-2 hover:bg-[var(--bg-sub)] border-b border-[var(--border)] last:border-0">
                                                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1"><span className="font-bold text-xs text-[var(--text-main)]">{l.jenis}</span>{l.statusTazir === 'Sudah' ? (<Badge color="green">Ditakzir {l.tazirBy || 'System'}</Badge>) : (<Badge color="red">Belum ditakzir</Badge>)}{l.keterangan && <span className="text-[10px] font-medium text-indigo-900 dark:text-indigo-100 italic bg-indigo-100/80 dark:bg-indigo-900/50 px-2 py-0.5 rounded border-l-2 border-indigo-500 w-fit">{l.keterangan}</span>}</div><div className="text-[10px] text-[var(--text-muted)] flex flex-wrap items-center gap-2"><span>{fmtDate(l.tglMelanggar)}</span>{l.inputBy && <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"><Icon name="User" className="w-2.5 h-2.5 text-slate-500" /><span className="text-[9px] font-bold text-slate-700 dark:text-slate-300">{l.inputBy}</span></div>}</div></div>
                                                        {canDelete && <button onClick={() => actions.del(l.id)} className="text-[10px] text-red-600 font-bold shrink-0">Hapus</button>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-[var(--bg-note)] rounded border border-[var(--border)] mt-2">
                                            <div className="p-2 text-[10px] font-bold text-amber-600 uppercase border-b border-[var(--border)]">Catatan:</div>
                                            {notes.map(n => (<div key={n.id} className="flex justify-between items-start gap-3 text-xs p-2 border-b border-[var(--border)] last:border-0"><span className="break-words min-w-0 flex-1">{n.isi}</span>{canDelete && <button onClick={() => actions.delNote(n.id)} className="text-red-500 font-bold shrink-0 text-sm px-1">×</button>}</div>))}
                                            <div className="p-2 flex gap-2"><input type="text" className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs" value={noteForm} onChange={e => setNoteForm(e.target.value)} placeholder="..." /><button onClick={() => actions.addNote(nama)} className="bg-amber-700 text-white px-3 py-1 rounded text-[10px] font-bold">Add</button></div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="divide-y divide-[var(--border)]">
                                        {items.map(l => (
                                            <div key={l.id} className="p-2 flex justify-between items-start gap-3 border-b border-[var(--border)] last:border-0">
                                                <div className="flex gap-2 flex-1 min-w-0">
                                                    {canDelete && <input type="checkbox" checked={selectedIds.includes(l.id)} onChange={() => toggleSel(l.id)} className="mt-1 accent-red-600 shrink-0" />}
                                                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1"><span className="font-bold text-xs text-[var(--text-main)]">{l.jenis}</span>{l.keterangan && <span className="text-[10px] font-medium text-indigo-900 dark:text-indigo-100 italic bg-indigo-100/80 dark:bg-indigo-900/50 px-2 py-0.5 rounded border-l-2 border-indigo-500 w-fit">{l.keterangan}</span>}</div><div className="text-[10px] text-[var(--text-muted)] flex flex-wrap items-center gap-2"><span>{fmtDate(l.tglMelanggar)}</span>{l.inputBy?.trim() && <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700"><Icon name="User" className="w-2.5 h-2.5 text-slate-500" /><span className="text-[9px] font-bold text-slate-700 dark:text-slate-300">{l.inputBy}</span></div>}</div></div>
                                                </div>
                                                {canDelete && <button onClick={() => actions.del(l.id)} className="text-[10px] text-red-600 font-bold shrink-0">Hapus</button>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});

const BatchUsers = memo(({ users, pending, types, onDel, onApprove, onReject, onUpdateUser, onAddManual }) => {
    const [pendingRoles, setPendingRoles] = useState({});
    const [showManual, setShowManual] = useState(false);
    const [manualForm, setManualForm] = useState({ email: "", nickname: "", role: ROLES.PETUGAS });
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [tempTypes, setTempTypes] = useState([]);
    const [tempRole, setTempRole] = useState("");
    const [tempNickname, setTempNickname] = useState("");
    const [historyModal, setHistoryModal] = useState(null);
    const [loadingHist, setLoadingHist] = useState(false);

    const openEdit = (u) => { setEditingAssignment(u); setTempTypes(u.assignedTypes || []); setTempRole(u.role); setTempNickname(u.nickname || ""); };
    const toggleType = (tName) => { setTempTypes(prev => prev.includes(tName) ? prev.filter(x => x !== tName) : [...prev, tName]); };
    const toggleAllTypes = () => { if (tempTypes.length === types.length) setTempTypes([]); else setTempTypes(types.map(t => t.nama)); };
    const saveEdit = () => { if (editingAssignment) { const finalTypes = tempRole === ROLES.PETUGAS ? tempTypes : []; onUpdateUser(editingAssignment.id, finalTypes, tempRole, tempNickname); setEditingAssignment(null); } };
    const openHistory = async (user) => { setLoadingHist(true); try { const { data, error } = await supabase.from('activity_logs').select('*').eq('email', user.email).order('created_at', { ascending: false }).limit(30); if (error) throw error; setHistoryModal({ user, logs: data || [] }); } catch (e) { alert("Gagal memuat history."); console.error(e); } finally { setLoadingHist(false); } };

    return (
        <div className="space-y-4">
            <button onClick={() => setShowManual(!showManual)} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase shadow-sm">{showManual ? "Batal Tambah" : "+ Tambah Member Manual"}</button>
            {showManual && (
                <div className="bg-[var(--bg-card)] border-2 border-blue-500/30 p-3 rounded-lg space-y-3">
                    <input type="email" placeholder="Email Google Member" className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={manualForm.email} onChange={e => setManualForm({ ...manualForm, email: e.target.value })} />
                    <input type="text" placeholder="Nama Panggilan" className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={manualForm.nickname} onChange={e => setManualForm({ ...manualForm, nickname: e.target.value })} />
                    <select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs font-bold" value={manualForm.role} onChange={e => setManualForm({ ...manualForm, role: e.target.value })}><option value={ROLES.PETUGAS}>Level: Petugas Absen</option><option value={ROLES.PENTAKZIR}>Level: Pentakzir</option><option value={ROLES.ADMIN}>Level: Admin</option></select>
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
                                <div className="flex justify-between items-center pt-2 border-t border-[var(--border)] border-dashed"><span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${u.role === 'admin' ? 'bg-red-100 text-red-600' : u.role === 'pentakzir' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{u.role}</span><div className="flex gap-1"><button onClick={() => openHistory(u)} className="text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-1.5 rounded-md transition border border-amber-200 dark:border-amber-800" title="Timeline">{loadingHist ? <span className="animate-spin h-3.5 w-3.5 block border-2 border-amber-600 border-t-transparent rounded-full"></span> : <Icon name="Clock" className="w-3.5 h-3.5" />}</button>{!['ma2n13@gmail.com', 'daruttauhidpotroyudan@gmail.com'].includes(u.email) && (<><button onClick={() => openEdit(u)} className="text-blue-600 bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-md transition border border-blue-200 dark:border-blue-800" title="Edit"><Icon name="Edit" className="w-3.5 h-3.5" /></button><button onClick={() => { if (confirm(`Yakin ingin menghapus ${u.nickname}?`)) onDel(u.id); }} className="text-red-600 bg-red-50 dark:bg-red-900/30 p-1.5 rounded-md transition border border-red-200 dark:border-red-800"><Icon name="Trash" className="w-3.5 h-3.5" /></button></>)}</div></div>
                            </div>
                            <div className="mt-2 bg-[var(--bg-sub)] p-2 rounded border border-[var(--border)] flex items-start gap-2"><Icon name="Activity" className="w-3 h-3 text-[var(--text-muted)] mt-0.5" /><div className="flex-1"><div className="text-[9px] font-bold text-[var(--text-accent)]">{lastSeenDate ? fmtTimeAgo(u.last_seen) : "Belum login"}</div><div className="text-[9px] text-[var(--text-muted)] italic line-clamp-1">Terakhir: {u.last_action || "-"}</div></div></div>
                            {u.role === ROLES.PETUGAS && (<div className="mt-1 flex flex-wrap gap-1">{u.assignedTypes && u.assignedTypes.length > 0 ? u.assignedTypes.map((t, idx) => (<span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[8px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{t}</span>)) : <span className="text-[9px] text-red-400 italic">Belum ada tugas</span>}</div>)}
                        </div>
                    );
                })}
            </div>
            {editingAssignment && (
                <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-[var(--bg-card)] w-full max-w-sm rounded-xl p-4 shadow-2xl border border-[var(--border)] max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-3 border-b border-[var(--border)] pb-2"><h3 className="font-bold text-sm">Edit Member</h3><button onClick={() => setEditingAssignment(null)} className="text-red-500 font-bold">✕</button></div>
                        <div className="mb-3"><label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Nama Panggilan</label><input type="text" className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs mt-1" value={tempNickname} onChange={e => setTempNickname(e.target.value)} /></div>
                        <div className="mb-3"><label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Level / Role</label><select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs font-bold mt-1" value={tempRole} onChange={e => setTempRole(e.target.value)}><option value={ROLES.PETUGAS}>Petugas Absen</option><option value={ROLES.PENTAKZIR}>Pentakzir</option><option value={ROLES.ADMIN}>Admin</option></select></div>
                        {tempRole === ROLES.PETUGAS ? (<><div className="flex justify-between items-center mb-2"><span className="text-[10px] text-[var(--text-muted)]">Tugas ({tempTypes.length})</span><button onClick={toggleAllTypes} className="text-[10px] text-blue-600 font-bold underline">{tempTypes.length === types.length ? "Hapus Semua" : "Pilih Semua"}</button></div><div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">{types.map(t => (<label key={t.id} className="flex items-center gap-2 text-xs p-2 rounded border border-[var(--border)] hover:bg-[var(--bg-sub)] cursor-pointer"><input type="checkbox" checked={tempTypes.includes(t.nama)} onChange={() => toggleType(t.nama)} className="accent-blue-600" />{t.nama}</label>))}</div></>) : (<div className="p-4 text-center bg-[var(--bg-sub)] rounded border border-[var(--border)] mb-4"><p className="text-xs text-[var(--text-muted)] italic">Level <b>{tempRole}</b> memiliki hak akses sistem yang lebih luas.</p></div>)}
                        <div className="mt-3 pt-2 border-t border-[var(--border)] flex gap-2"><button onClick={() => setEditingAssignment(null)} className="flex-1 py-2 rounded bg-gray-200 text-gray-800 text-xs font-bold">Batal</button><button onClick={saveEdit} className="flex-1 py-2 rounded bg-blue-600 text-white text-xs font-bold">Simpan</button></div>
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
                    <div className="divide-y divide-amber-200">{pending.map(p => (<div key={p.id} className="p-3"><div className="flex justify-between items-start mb-2"><div className="text-xs"><div className="font-bold text-[var(--text-main)]">{p.nickname}</div><div className="text-[10px] opacity-70">{p.email}</div></div><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${p.role === 'pentakzir' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{p.role === 'pentakzir' ? 'Minta: Pentakzir' : 'Minta: Petugas'}</span></div>{p.role !== 'pentakzir' && (<div className="text-[10px] bg-white/50 dark:bg-black/20 p-2 rounded border border-amber-200 mb-2"><div className="font-bold text-amber-800 dark:text-amber-500 mb-0.5">Tugas yang dipilih:</div><div className="italic text-gray-600 dark:text-gray-400">{p.assignedTypes?.length > 0 ? p.assignedTypes.join(", ") : "Tidak memilih tugas"}</div></div>)}<div className="flex gap-2 items-center"><select className="flex-1 text-[10px] border border-amber-300 rounded p-1 bg-white" value={pendingRoles?.[p.id] || p.role || "petugas_absen"} onChange={(e) => setPendingRoles({ ...pendingRoles, [p.id]: e.target.value })}><option value="petugas_absen">Setujui sbg: Petugas</option><option value="pentakzir">Setujui sbg: Pentakzir</option><option value="admin">Setujui sbg: Admin</option></select><button onClick={() => onApprove(p, pendingRoles?.[p.id] || p.role || "petugas_absen")} className="bg-green-600 text-white px-3 py-1 rounded text-[10px] font-bold">Terima</button><button onClick={() => onReject(p.id)} className="bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold">Tolak</button></div></div>))}</div>
                </div>
            )}
        </div>
    );
});

const BatchSantri = memo(({ santri, form, setForm, edit, setEdit, onAdd, onUpdate, onDel, isAdmin }) => {
    const [tagInput, setTagInput] = useState("");
    const filteredSantri = useMemo(() => { if (!form) return santri; return santri.filter(s => s.nama.toLowerCase().includes(form.toLowerCase())); }, [santri, form]);
    const addTag = () => { if (!tagInput.trim() || !edit) return; const currentTags = edit.labels || []; if (!currentTags.includes(tagInput.trim())) setEdit({ ...edit, labels: [...currentTags, tagInput.trim()] }); setTagInput(""); };
    const removeTag = (tag) => { if (!edit) return; setEdit({ ...edit, labels: edit.labels.filter(t => t !== tag) }); };
    
    return (
        <div className="space-y-4 flex flex-col h-full">
            <div className="flex gap-2 flex-none">
                <input type="text" className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs" placeholder={edit ? "Edit Nama/Tag..." : "Cari Santri..."} value={edit ? edit.nama : form} onChange={e => edit ? setEdit({ ...edit, nama: e.target.value }) : setForm(e.target.value)} disabled={edit && !isAdmin} />
                {!edit && isAdmin && (<button onClick={onAdd} className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold uppercase shadow-sm whitespace-nowrap">+</button>)}
            </div>
            {edit && (
                <div className="bg-[var(--bg-sub)] p-3 rounded-lg border border-[var(--border)] space-y-3">
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
                    <div key={s.id} className="p-2 flex justify-between items-center text-xs hover:bg-[var(--bg-hover)] transition-colors">
                        <div className="flex flex-col gap-1 w-full" onClick={() => setEdit({ ...s, labels: s.labels || [] })}><div className="flex items-center gap-2 cursor-pointer"><span className="font-medium">{s.nama}</span><div className="flex gap-0.5">{s.labels && s.labels.slice(0, 3).map((t, i) => (<div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400" title={t}></div>))}{s.labels && s.labels.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>}</div></div></div>
                        <div className="flex gap-2 items-center"><button onClick={() => setEdit({ ...s, labels: s.labels || [] })} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded transition"><Icon name="Edit" className="w-4 h-4" /></button>{isAdmin && <button onClick={() => onDel(s.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded transition"><Icon name="Trash" className="w-4 h-4" /></button>}</div>
                    </div>
                ))}
            </div>
        </div>
    );
});

// --- COMPONENT BARU: CRUD Jenis Pelanggaran ---
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
                    <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border)]"><h4 className="text-[10px] font-bold uppercase mb-2 text-[var(--text-muted)]">Cari Pelanggaran Harian</h4><div className="flex flex-col gap-2"><input type="date" className="bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-2 text-xs" value={searchState.date} onChange={e => setSearch({ ...searchState, date: e.target.value })} /><select className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-2 text-xs" value={searchState.jenis} onChange={e => setSearch({ ...searchState, jenis: e.target.value })}><option value="">Pilih Pelanggaran...</option>{types.map(t => <option key={t.id} value={t.nama}>{t.nama}</option>)}</select><button onClick={onSearch} className="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold uppercase">Cari Data</button></div></div>
                    {result.length > 0 && (<div className="space-y-2"><div className="max-h-40 overflow-y-auto border border-[var(--border)] rounded p-2 bg-[var(--bg-sub)] custom-scrollbar">{result.map(r => <label key={r.id} className="flex items-center gap-2 text-xs py-1"><input type="checkbox" checked={selected.includes(r.id)} onChange={() => setSelected(p => p.includes(r.id) ? p.filter(x => x !== r.id) : [...p, r.id])} />{r.nama}</label>)}</div><div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-200 grid grid-cols-1 gap-2"><span className="text-[10px] font-bold text-amber-700 uppercase">Aksi Massal:</span><input type="date" className="bg-white border rounded px-2 py-2 text-xs text-black" value={target.newDate} onChange={e => setTarget({ ...target, newDate: e.target.value })} /><select className="bg-white border rounded px-2 py-2 text-xs text-black" value={target.newJenis} onChange={e => setTarget({ ...target, newJenis: e.target.value })}>{types.map(t => <option key={t.id} value={t.nama}>{t.nama}</option>)}</select><div className="grid grid-cols-2 gap-2 mt-1"><button onClick={() => onExec('update')} className="bg-green-600 text-white py-2 rounded text-[10px] font-bold uppercase">Update</button><button onClick={() => onExec('delete')} className="bg-red-600 text-white py-2 rounded text-[10px] font-bold uppercase">Hapus</button></div></div></div>)}
                </div>
            ) : (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 rounded-lg space-y-3"><h4 className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Pindah Data Masal (Range Tanggal)</h4><div className="grid grid-cols-2 gap-2"><input type="date" className="bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={rangeForm.start} onChange={e => setRangeForm(p => ({ ...p, start: e.target.value }))} /><input type="date" className="bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={rangeForm.end} onChange={e => setRangeForm(p => ({ ...p, end: e.target.value }))} /></div><select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={rangeForm.oldJenis} onChange={e => setRangeForm(p => ({ ...p, oldJenis: e.target.value }))}><option value="">Pilih Pelanggaran Lama...</option>{types.map(j => <option key={j.id} value={j.nama}>{j.nama}</option>)}</select><select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={rangeForm.newJenis} onChange={e => setRangeForm(p => ({ ...p, newJenis: e.target.value }))}><option value="">Pilih Pelanggaran Baru...</option>{types.map(j => <option key={j.id} value={j.nama}>{j.nama}</option>)}</select><button onClick={onMigrate} className="w-full bg-amber-600 text-white py-3 rounded-lg font-bold text-xs uppercase shadow-md">Eksekusi Migrasi Data</button></div>
            )}
        </div>
    );
});

const BatchDanger = memo(({ form, setForm, onExec, loading }) => (
    <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 p-3 rounded-lg">
            <h3 className="text-red-600 font-bold uppercase text-[10px] mb-2">Hapus Logs Berdasarkan Range Tanggal</h3>
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <input type="date" className="flex-1 bg-white border border-red-200 rounded px-2 py-2 text-xs text-black" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} />
                <input type="date" className="flex-1 bg-white border border-red-200 rounded px-2 py-2 text-xs text-black" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} />
            </div>
            <button onClick={onExec} className="w-full bg-red-600 text-white py-2 rounded font-bold text-xs">{loading ? "MENGHAPUS..." : "HAPUS PERMANEN"}</button>
        </div>
    </div>
));

const TagFilterBar = memo(({ tags, selected, toggle }) => {
    if (!tags || tags.length === 0) return null;
    return (
        <div className="w-full overflow-x-auto whitespace-nowrap pb-1 mt-2 border-b border-[var(--border)]/50 no-scrollbar">
            <div className="inline-flex items-center gap-2 px-1">
                <Icon name="Tag" className="w-4 h-4 text-[var(--text-muted)] shrink-0 sticky left-0 bg-[var(--bg-main)] pr-1" />
                {tags.sort().map(tag => {
                    const isActive = selected.includes(tag);
                    return (<button key={tag} onClick={() => toggle(tag)} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${isActive ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-[var(--bg-sub)] text-[var(--text-muted)] border-[var(--border)] hover:border-indigo-400"}`}>{tag}</button>);
                })}{selected.length > 0 && (<button onClick={() => selected.forEach(t => toggle(t))} className="text-[10px] text-red-500 font-bold hover:underline px-2">Reset</button>)}
            </div>
        </div>
    );
});

// --- MAIN COMPONENT ---
export default function App() {
    const [ui, setUi] = useState({
        user: null, role: null, dbUser: null,
        isPending: false, isInitializing: true,
        tab: "takziran", menu: false, loading: false, toast: null,
        dark: localStorage.getItem("theme") !== "light", batchMode: "users",
        fontSize: 0
    });
    
    // State Data utama
    const [data, setData] = useState({ santri: [], jenis: [], logs: [], catatan: [], users: [], pendingUsers: [] });
    
    // State Forms & UI Inputs
    const [forms, setForms] = useState({
        input: { jenis: "", date: getDate(), students: [], isTazir: "Belum", keterangan: "" },
        inputSearch: "",
        note: "", santri: "", editSantri: null,
        jenisInput: "", editJenis: null, // <-- Tambahan state untuk input Jenis Pelanggaran
        bulkDel: { start: getDate(), end: getDate() }, daily: { date: getDate(), jenis: "" }, batchTarget: { newJenis: "", newDate: "" },
        range: { start: getDate(new Date(Date.now() - 7 * 864e5)), end: getDate(), oldJenis: "", newJenis: "" }, restoreFile: null,
        filter: { start: getDate(new Date(Date.now() - 30 * 864e5)), end: getDate() },
        regNickname: "", regRole: ROLES.PETUGAS, regAssignment: [], search: "",
        filterTags: []
    });
    
    // OPTIMISASI: Gunakan ref untuk mengakses 'forms' di dalam event handler tanpa memicu re-creation function
    const formsRef = useRef(forms);
    useEffect(() => { formsRef.current = forms; }, [forms]);

    const [expanded, setExpanded] = useState({});
    const [dailyRes, setDailyRes] = useState({ list: [], selected: [] });

    // --- ACTIVITY LOGGER ---
    const logActivity = useCallback(async (action) => {
        if (!ui.dbUser?.id) return;
        const now = new Date().toISOString();
        try {
            await supabase.from('manage_users').update({ last_seen: now, last_action: action }).eq('id', ui.dbUser.id);
            await supabase.from('activity_logs').insert({ email: ui.dbUser.email, nickname: ui.dbUser.nickname, action: action, created_at: now });
        } catch (e) { console.error("Log error", e); }
    }, [ui.dbUser]); // Dep only on stable user obj

    // --- COMPUTED DATA ---
    const allUniqueTags = useMemo(() => {
        const tags = new Set();
        data.santri.forEach(s => { if (s.labels && Array.isArray(s.labels)) s.labels.forEach(tag => tags.add(tag)); });
        return Array.from(tags);
    }, [data.santri]);

    const groupedLogs = useMemo(() => {
        // Hanya hitung ulang jika logs atau santri berubah, BUKAN saat user mengetik search
        const allowedNames = data.santri.map(s => s.nama);
        const filtered = data.logs.filter(l => allowedNames.includes(l.nama));
        return filtered.reduce((acc, cur) => { (acc[cur.nama] = acc[cur.nama] || []).push(cur); return acc; }, {});
    }, [data.logs, data.santri]);

    const groupedNotes = useMemo(() => data.catatan.reduce((acc, cur) => { (acc[cur.nama] = acc[cur.nama] || []).push(cur); return acc; }, {}), [data.catatan]);

    // --- DATA FETCHING (MODIFIED FOR REALTIME BACKGROUND UPDATES) ---
    // Menerima parameter isBackground (default false). Jika true, loading spinner tidak akan muncul.
    const fetchData = useCallback(async (isBackground = false) => {
        if (!ui.user) return;
        
        // Hanya tampilkan loading jika BUKAN update dari realtime/background
        if (!isBackground) setUi(p => ({ ...p, loading: true }));
        
        try {
            const [s, j, u, p, l, c] = await Promise.all([
                supabase.from('master_santri').select('*').order('nama'),
                supabase.from('master_jenis').select('*').order('nama'),
                supabase.from('manage_users').select('*').order('email'),
                supabase.from('users_pending').select('*').order('createdAt'),
                supabase.from('logs_pelanggaran').select('*').order('tglMelanggar', { ascending: false }),
                supabase.from('santri_catatan').select('*').order('createdAt', { ascending: false })
            ]);
            setData({ santri: s.data || [], jenis: j.data || [], users: u.data || [], pendingUsers: p.data || [], logs: l.data || [], catatan: c.data || [] });
        } catch (err) { console.error("Fetch Error:", err); }
        finally { 
            // Hanya matikan loading jika tadi dihidupkan
            if (!isBackground) setUi(p => ({ ...p, loading: false })); 
        }
    }, [ui.user]);

    useEffect(() => {
        // Load data awal (pakai loading)
        if (ui.user) fetchData();
        
        const sub = supabase.channel('db-changes')
            // Panggil fetchData(true) agar update terjadi di background tanpa spinner
            .on('postgres_changes', { event: '*', schema: 'public', table: 'logs_pelanggaran' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'manage_users' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users_pending' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'master_santri' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'master_jenis' }, () => fetchData(true))
            .subscribe();
            
        return () => { supabase.removeChannel(sub); }
    }, [fetchData, ui.user]);

    // Theme & Font
    useEffect(() => { document.body.classList.toggle('dark-mode', ui.dark); }, [ui.dark]);
    useEffect(() => { document.documentElement.style.fontSize = ['14px', '16px', '18px'][ui.fontSize]; }, [ui.fontSize]);

    // Auth Check
    useEffect(() => {
        const checkUser = async (u) => {
            if (!u) { setUi(p => ({ ...p, user: null, role: null, dbUser: null, isPending: false, isInitializing: false })); return; }
            if (SUPER_ADMINS.includes(u.email)) {
                let { data: ex } = await supabase.from('manage_users').select('*').eq('email', u.email).maybeSingle();
                if (!ex) { const { data: n, error } = await supabase.from('manage_users').insert([{ email: u.email, role: 'admin', nickname: 'Super Admin', last_seen: new Date().toISOString(), last_action: 'Login' }]).select().single(); if (!error) ex = n; }
                else await supabase.from('manage_users').update({ last_seen: new Date().toISOString(), last_action: 'Login' }).eq('id', ex.id);
                setUi(p => ({ ...p, user: u, role: 'admin', dbUser: ex, isPending: false, isInitializing: false }));
                return;
            }
            try {
                const { data: found } = await supabase.from('manage_users').select('*').eq('email', u.email).maybeSingle();
                if (found) {
                    await supabase.from('manage_users').update({ last_seen: new Date().toISOString(), last_action: 'Login' }).eq('id', found.id);
                    setUi(p => ({ ...p, user: u, role: found.role, dbUser: found, isPending: false, isInitializing: false }));
                } else {
                    const { data: pend } = await supabase.from('users_pending').select('*').eq('email', u.email).maybeSingle();
                    setUi(p => ({ ...p, user: u, isPending: !!pend, dbUser: null, isInitializing: false }));
                }
            } catch (err) { setUi(p => ({ ...p, isInitializing: false })); }
        };
        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) await checkUser(session.user);
            else setUi(p => ({ ...p, isInitializing: false }));
        };
        initAuth();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (evt, session) => {
            if (evt === 'SIGNED_IN' && session?.user) checkUser(session.user);
            else if (evt === 'SIGNED_OUT') setUi(p => ({ ...p, user: null, role: null, dbUser: null, isPending: false, isInitializing: false }));
        });
        return () => subscription.unsubscribe();
    }, []);

    // Helper functions
    const showToast = useCallback((msg) => { setUi(p => ({ ...p, toast: msg })); setTimeout(() => setUi(p => ({ ...p, toast: null })), 3000); }, []);
    const exec = useCallback(async (fn, confirmMsg) => { if (confirmMsg && !confirm(confirmMsg)) return; setUi(p => ({ ...p, loading: true })); try { await fn(); } catch (e) { alert(e.message); } setUi(p => ({ ...p, loading: false })); }, []);

    // --- CRUD ACTIONS (STABLE REFS) ---
    // Menggunakan formsRef.current agar function 'crud' tidak berubah saat state forms berubah
    // Ini mencegah re-render masif pada child components.
    const crud = useMemo(() => ({
        save: (e) => { 
            e.preventDefault(); 
            const f = formsRef.current.input; 
            if (!f.jenis || !f.students.length) return alert("Pilih data!"); 
            exec(async () => { 
                const payload = f.students.map(nama => ({ nama, jenis: f.jenis, tglMelanggar: f.date, statusTazir: 'Belum', keterangan: f.keterangan, inputBy: ui.dbUser?.nickname || "System" })); 
                await supabase.from('logs_pelanggaran').insert(payload); 
                await logActivity(`Input: ${f.jenis} (${f.students.length} Santri)`); 
                setForms(p => ({ ...p, input: { ...p.input, students: [], keterangan: "" }, inputSearch: "" })); 
                showToast("Berhasil Disimpan"); 
            }); 
        },
        delMany: (ids) => exec(async () => { await supabase.from('logs_pelanggaran').delete().in('id', ids); setData(prev => ({ ...prev, logs: prev.logs.filter(item => !ids.includes(item.id)) })); showToast("Terhapus"); }, `Hapus ${ids.length} item?`),
        del: (id) => exec(async () => { await supabase.from('logs_pelanggaran').delete().eq('id', id); setData(prev => ({ ...prev, logs: prev.logs.filter(item => item.id !== id) })); showToast("Terhapus"); }),
        delAll: (nama) => exec(async () => { await supabase.from('logs_pelanggaran').delete().eq('nama', nama); setData(prev => ({ ...prev, logs: prev.logs.filter(l => l.nama !== nama) })); showToast(`Semua data ${nama} dihapus`); }, `YAKIN? Semua riwayat pelanggaran ${nama} akan hilang selamanya!`),
        tazir: (nama, e) => { e.stopPropagation(); exec(async () => { const tazirName = ui.dbUser?.nickname || "System"; setData(prev => ({ ...prev, logs: prev.logs.map(l => (l.nama === nama && l.statusTazir === 'Belum') ? { ...l, statusTazir: 'Sudah', tazirBy: tazirName } : l) })); await supabase.from('logs_pelanggaran').update({ statusTazir: "Sudah", tazirBy: tazirName }).eq('nama', nama).eq('statusTazir', 'Belum'); await logActivity(`Menakzir: ${nama}`); showToast("Status Diperbarui"); }); },
        addNote: (nama) => { const n = formsRef.current.note; if (n.trim()) exec(async () => { const { data: newNote, error } = await supabase.from('santri_catatan').insert([{ nama, isi: n }]).select().single(); if (error) throw error; setData(p => ({ ...p, catatan: [newNote, ...p.catatan] })); setForms(p => ({ ...p, note: "" })); showToast("Catatan Ditambahkan"); }); },
        delNote: (id) => exec(async () => { setData(p => ({ ...p, catatan: p.catatan.filter(c => c.id !== id) })); await supabase.from('santri_catatan').delete().eq('id', id); showToast("Catatan Dihapus"); }),
        searchDaily: async () => { const f = formsRef.current.daily; if (!f.jenis) return; const { data } = await supabase.from('logs_pelanggaran').select('*').eq("tglMelanggar", f.date).eq("jenis", f.jenis); setDailyRes({ list: data || [], selected: (data || []).map(r => r.id) }); setForms(p => ({ ...p, batchTarget: { newJenis: f.jenis, newDate: f.date } })); },
        updateBatch: (action) => exec(async () => { const bt = formsRef.current.batchTarget; if (action === 'delete') await supabase.from('logs_pelanggaran').delete().in('id', dailyRes.selected); else await supabase.from('logs_pelanggaran').update({ jenis: bt.newJenis, tglMelanggar: bt.newDate }).in('id', dailyRes.selected); showToast("Batch Sukses"); setDailyRes({ list: [], selected: [] }); }, `Konfirmasi ${action}?`),
        backup: () => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([JSON.stringify({ collections: { master_santri: data.santri, master_jenis: data.jenis, logs_pelanggaran: data.logs, santri_catatan: data.catatan } }, null, 2)], { type: "application/json" })); link.download = `backup_${getDate()}.json`; link.click(); },
        processRestore: () => exec(async () => { const json = JSON.parse(await formsRef.current.restoreFile.text()); const toISO = ts => ts?.seconds ? new Date(ts.seconds * 1000).toISOString() : (typeof ts === 'string' ? ts : new Date().toISOString()); if (json.collections.master_santri) await supabase.from('master_santri').upsert(json.collections.master_santri.map(x => ({ id: x.id, nama: x.nama, labels: x.labels || [] }))); if (json.collections.master_jenis) await supabase.from('master_jenis').upsert(json.collections.master_jenis.map(x => ({ id: x.id, nama: x.nama }))); if (json.collections.logs_pelanggaran) { const logs = json.collections.logs_pelanggaran.map(x => ({ id: x.id, nama: x.nama, jenis: x.jenis, tglMelanggar: x.tglMelanggar, statusTazir: x.statusTazir, keterangan: x.keterangan, createdAt: toISO(x.createdAt) })); for (let i = 0; i < logs.length; i += 500) await supabase.from('logs_pelanggaran').upsert(logs.slice(i, i + 500)); } if (json.collections.santri_catatan) await supabase.from('santri_catatan').upsert(json.collections.santri_catatan.map(x => ({ id: x.id, nama: x.nama, isi: x.isi, createdAt: toISO(x.createdAt) }))); showToast("Restore Berhasil"); }),
        migrateRange: () => exec(async () => { const r = formsRef.current.range; await supabase.from('logs_pelanggaran').update({ jenis: r.newJenis }).gte('tglMelanggar', r.start).lte('tglMelanggar', r.end).eq('jenis', r.oldJenis); showToast("Migrasi Selesai"); }),
        
        // --- SANTRI CRUD ---
        addSantri: () => { const s = formsRef.current.santri; if (s.trim()) exec(async () => { const { data: newS, error } = await supabase.from('master_santri').insert([{ nama: s, labels: [] }]).select(); if (error) throw error; setData(p => ({ ...p, santri: [...p.santri, ...newS].sort((a, b) => a.nama.localeCompare(b.nama)) })); setForms(p => ({ ...p, santri: "" })); showToast("Santri ditambahkan"); }); },
        updateSantri: () => exec(async () => { const es = formsRef.current.editSantri; await supabase.from('master_santri').update({ nama: es.nama, labels: es.labels || [] }).eq('id', es.id); setData(p => ({ ...p, santri: p.santri.map(s => s.id === es.id ? { ...s, nama: es.nama, labels: es.labels || [] } : s).sort((a, b) => a.nama.localeCompare(b.nama)) })); setForms(p => ({ ...p, editSantri: null })); showToast("Data diperbarui"); }),
        deleteSantri: (id) => exec(async () => { await supabase.from('master_santri').delete().eq('id', id); setData(p => ({ ...p, santri: p.santri.filter(s => s.id !== id) })); showToast("Santri dihapus"); }, "Hapus santri ini?"),
        
        // --- JENIS PELANGGARAN CRUD ---
        addJenis: () => { const j = formsRef.current.jenisInput; if (j.trim()) exec(async () => { const { data: newJ, error } = await supabase.from('master_jenis').insert([{ nama: j.trim() }]).select(); if (error) throw error; setData(p => ({ ...p, jenis: [...p.jenis, ...newJ].sort((a, b) => a.nama.localeCompare(b.nama)) })); setForms(p => ({ ...p, jenisInput: "" })); showToast("Jenis ditambahkan"); }); },
        updateJenis: () => exec(async () => { const ej = formsRef.current.editJenis; if (!ej || !ej.nama.trim()) return; await supabase.from('master_jenis').update({ nama: ej.nama.trim() }).eq('id', ej.id); setData(p => ({ ...p, jenis: p.jenis.map(j => j.id === ej.id ? { ...j, nama: ej.nama.trim() } : j).sort((a, b) => a.nama.localeCompare(b.nama)) })); setForms(p => ({ ...p, editJenis: null })); showToast("Jenis diperbarui"); }),
        deleteJenis: (id) => exec(async () => { await supabase.from('master_jenis').delete().eq('id', id); setData(p => ({ ...p, jenis: p.jenis.filter(j => j.id !== id) })); showToast("Jenis dihapus"); }, "Hapus jenis pelanggaran ini? Awas, data lama mungkin kehilangan referensi."),
        
        approveUser: (u, role) => exec(async () => { await supabase.from('manage_users').upsert({ email: u.email, role: role, nickname: u.nickname, assignedTypes: u.assignedTypes || [] }, { onConflict: 'email' }); await supabase.from('users_pending').delete().eq('id', u.id); setData(p => ({ ...p, users: [...p.users, { ...u, role, assignedTypes: u.assignedTypes || [] }], pendingUsers: p.pendingUsers.filter(x => x.id !== u.id) })); showToast(`Berhasil menerima sebagai ${role}`); }),
        rejectUser: (id) => exec(async () => { await supabase.from('users_pending').delete().eq('id', id); setData(p => ({ ...p, pendingUsers: p.pendingUsers.filter(x => x.id !== id) })); showToast("Permintaan Ditolak"); }),
        delMember: (id) => exec(async () => { await supabase.from('manage_users').delete().eq('id', id); setData(p => ({ ...p, users: p.users.filter(u => u.id !== id) })); showToast("Member Dihapus"); }),
        updateUser: (id, types, role, nickname) => exec(async () => { await supabase.from('manage_users').update({ assignedTypes: types || [], role: role, nickname: nickname }).eq('id', id); setData(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, role, assignedTypes: types, nickname } : u) })); showToast("Member Diperbarui!"); }),
        addManualUser: (f) => exec(async () => { if (!f.email || !f.nickname) throw new Error("Email & Nama wajib isi"); await supabase.from('manage_users').upsert([{ email: f.email, nickname: f.nickname, role: f.role, assignedTypes: [] }], { onConflict: 'email' }); showToast("Member Manual Ditambahkan!"); })
    }), [data, dailyRes, exec, showToast, logActivity, ui.dbUser]); // Hilangkan 'forms' dari dependencies

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUi({ user: null, role: null, dbUser: null, isPending: false, isInitializing: false, tab: "takziran", menu: false, loading: false, toast: null, dark: ui.dark, fontSize: 0, batchMode: "users" });
        setData({ santri: [], jenis: [], logs: [], catatan: [], users: [], pendingUsers: [] });
    };

    const toggleFilterTag = useCallback((tag) => {
        setForms(p => {
            const current = p.filterTags || [];
            return { ...p, filterTags: current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag] };
        });
    }, []);

    const isAdmin = ui.role === ROLES.ADMIN;
    const inputTypes = useMemo(() => (isAdmin ? data.jenis : data.jenis.filter(j => ui.dbUser?.assignedTypes?.includes(j.nama) || !ui.dbUser?.assignedTypes?.length)), [data.jenis, isAdmin, ui.dbUser]);

    // --- RENDER ---
    if (ui.isInitializing) return <div className="h-[100dvh] flex flex-col items-center justify-center bg-[var(--bg-main)]"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div><p className="text-xs font-bold text-[var(--text-muted)] animate-pulse">Memuat Sesi...</p></div>;
    
    if (!ui.user) return (
        <div className="h-[100dvh] flex flex-col items-center justify-center p-6 bg-[var(--bg-main)] text-[var(--text-main)] transition-colors">
            <div className="text-center space-y-6 max-w-sm w-full">
                <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3"><Icon name="List" className="w-8 h-8 text-white" /></div>
                <div><h1 className="text-2xl font-bold tracking-tight text-[var(--text-accent)]">Absensi Santri</h1><p className="text-sm text-[var(--text-muted)] mt-2">PP. Daruttauhid Al 'Alawiyyah Jepara</p></div>
                <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })} className="w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-800 dark:text-white py-3 px-4 rounded-xl shadow-sm transition-all text-sm font-bold"><GoogleLogo /><span>Masuk dengan Google</span></button>
            </div>
        </div>
    );

    if (ui.user && !ui.dbUser) {
        if (ui.isPending) return <div className="h-screen flex flex-col items-center justify-center p-6 text-center gap-4 bg-[var(--bg-main)]">⏳<h1 className="font-bold text-sm uppercase">Menunggu Persetujuan Admin</h1><p className="text-xs text-[var(--text-muted)]">Permintaan Anda sedang ditinjau.</p><button onClick={handleLogout} className="text-red-500 underline text-[10px] font-bold">LOGOUT / BATAL</button></div>;
        return (
            <div className="fixed inset-0 z-[60] bg-[var(--bg-main)] flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
                    <div className="text-center"><h2 className="text-lg font-bold text-[var(--text-accent)]">Daftar Pengurus</h2><p className="text-[10px] text-[var(--text-muted)]">Lengkapi data untuk akses aplikasi</p></div>
                    <div className="space-y-3">
                        <div><label className="text-[10px] font-bold uppercase ml-1">Nama Panggilan</label><input type="text" placeholder="Contoh: Kang Ahmad" onChange={e => setForms(p => ({ ...p, regNickname: e.target.value }))} className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs" /></div>
                        <div><label className="text-[10px] font-bold uppercase ml-1">Daftar Sebagai</label><select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs" onChange={e => setForms(p => ({ ...p, regRole: e.target.value }))} value={forms.regRole || ROLES.PETUGAS}><option value={ROLES.PETUGAS}>Petugas Absen / Pencatat</option><option value={ROLES.PENTAKZIR}>Pentakzir</option></select></div>
                        {(forms.regRole !== ROLES.PENTAKZIR) && (<div><div className="flex justify-between items-center mb-1"><label className="text-[10px] font-bold uppercase ml-1">Tugas Rekam Data</label><button onClick={() => setForms(p => ({ ...p, regAssignment: p.regAssignment?.length === data.jenis.length ? [] : data.jenis.map(j => j.nama) }))} className="text-[10px] text-blue-600 font-bold underline">{forms.regAssignment?.length === data.jenis.length ? "Hapus Semua" : "Pilih Semua"}</button></div><div className="p-3 bg-[var(--bg-sub)] border border-[var(--border)] rounded-lg max-h-40 overflow-y-auto space-y-2">{data.jenis.map(j => (<label key={j.id} className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={forms.regAssignment?.includes(j.nama)} onChange={(e) => { const val = j.nama; setForms(p => { const current = p.regAssignment || []; return { ...p, regAssignment: e.target.checked ? [...current, val] : current.filter(x => x !== val) }; }); }} />{j.nama}</label>))}</div></div>)}
                    </div>
                    <button onClick={async () => { if (!forms.regNickname) return alert("Isi nama panggilan!"); setUi(p => ({ ...p, loading: true })); const { error } = await supabase.from('users_pending').insert([{ email: ui.user.email, uid: ui.user.id, nickname: forms.regNickname, role: forms.regRole || ROLES.PETUGAS, assignedTypes: forms.regRole === ROLES.PENTAKZIR ? [] : (forms.regAssignment || []) }]); if (error) alert(error.message); else setUi(p => ({ ...p, isPending: true })); setUi(p => ({ ...p, loading: false })); }} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm">KIRIM PERMINTAAN AKSES</button>
                </div>
            </div>
        );
    }

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
                            {['grafik', 'database'].map(t => <button key={t} onClick={() => setUi(p => ({ ...p, tab: t }))} className="w-full text-left px-5 py-3 capitalize text-sm hover:bg-[var(--bg-hover)]">{t === 'database' ? (isAdmin ? 'Admin Panel' : 'Data Santri') : t}</button>)}
                            <button onClick={handleLogout} className="w-full text-left px-5 py-3 text-sm font-bold border-t border-[var(--border)] hover:bg-[var(--bg-hover)]">Logout</button>
                        </div>
                    )}
                </div>
            </div>

            {ui.toast && <div className="fixed top-14 inset-x-0 z-[100] flex justify-center pointer-events-none"><div className="bg-green-600 text-white px-5 py-2 rounded-full shadow-lg text-xs font-bold animate-bounce">{ui.toast}</div></div>}

            <div className="flex-1 flex flex-col overflow-hidden relative">
                {ui.role && ui.tab === "input" ? (
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)] flex flex-col h-full shadow-sm gap-3">
                            
                            {/* PESAN PANDUAN BARU */}
                            <div className="bg-amber-100 dark:bg-amber-900/40 border-l-4 border-amber-500 text-amber-900 dark:text-amber-200 p-3 rounded shadow-sm text-xs font-medium flex items-start gap-2 animate-pulse">
                                <span className="text-amber-600 dark:text-amber-400 text-base shrink-0 leading-none">⚠️</span>
                                <span><b className="uppercase">Panduan Penting:</b> Silakan <b>KLIK</b> pada nama santri yang <b>TIDAK HADIR</b> atau <b>MELANGGAR</b>. Santri yang hadir/tertib tidak perlu Anda klik.</span>
                            </div>

                            <div className="flex flex-col gap-2 flex-none">
                                <select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all" value={forms.input.jenis} onChange={e => setForms(p => ({ ...p, input: { ...p.input, jenis: e.target.value } }))}><option value="">-- Pilih Pelanggaran --</option>{inputTypes.map(j => (<option key={j.id} value={j.nama}>{j.nama}</option>))}</select>
                                <div className="relative w-full"><div className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-medium flex justify-between items-center text-[var(--text-main)]"><span>{fmtDate(forms.input.date)}</span><Icon name="Calendar" className="w-4 h-4 text-[var(--text-muted)]" /></div><input type="date" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value={forms.input.date} onChange={e => setForms(p => ({ ...p, input: { ...p.input, date: e.target.value } }))} /></div>
                            </div>
                            <div className="relative flex-none"><Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" /><input type="text" className="w-full bg-[var(--bg-sub)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2.5 text-xs placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-input)] transition-colors outline-none" placeholder="Cari Santri..." value={forms.inputSearch} onChange={e => setForms(p => ({ ...p, inputSearch: e.target.value }))} /></div>
                            <div className="flex-1 bg-[var(--bg-sub)]/30 rounded-lg border border-[var(--border)] p-2 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 content-start gap-2 custom-scrollbar">
                                {data.santri.filter(s => {
                                    const query = (forms.inputSearch || "").toLowerCase();
                                    return s.nama.toLowerCase().includes(query) || (s.labels && s.labels.some(t => t.toLowerCase().includes(query)));
                                }).map(s => { const isSelected = forms.input.students.includes(s.nama); return (<div key={s.id} onClick={() => setForms(p => ({ ...p, input: { ...p.input, students: isSelected ? p.input.students.filter(x => x !== s.nama) : [...p.input.students, s.nama] } }))} className={`px-2 py-1.5 rounded-lg text-[10px] text-center transition-all cursor-pointer select-none border flex items-center justify-center font-medium ${isSelected ? "bg-blue-600 text-white font-bold border-blue-600 shadow-md transform scale-[1.02]" : "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-main)] hover:border-blue-400 hover:bg-[var(--bg-hover)]"}`}>{s.nama}</div>); })}
                                {data.santri.length > 0 && data.santri.filter(s => s.nama.toLowerCase().includes((forms.inputSearch || "").toLowerCase()) || (s.labels && s.labels.some(t => t.toLowerCase().includes((forms.inputSearch || "").toLowerCase())))).length === 0 && (<div className="col-span-full text-center text-[var(--text-muted)] text-[10px] py-10 italic">Santri tidak ditemukan</div>)}
                            </div>
                            <div className="flex-none pt-2 border-t border-[var(--border)] flex flex-col gap-2"><div className="flex gap-2 w-full"><input className="flex-1 w-0 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Catatan (Opsional)..." value={forms.input.keterangan} onChange={e => setForms(p => ({ ...p, input: { ...p.input, keterangan: e.target.value } }))} /><button onClick={crud.save} className="flex-none shrink-0 bg-blue-600 text-white w-14 rounded-lg font-bold text-xs shadow hover:bg-blue-700 active:scale-[0.98] transition-transform flex items-center justify-center gap-1" title="Simpan Data"><Icon name="Save" className="w-5 h-5" /><span className="text-sm">{forms.input.students.length > 0 ? forms.input.students.length : ''}</span></button></div></div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">
                        {(ui.tab === "takziran" || ui.tab === "riwayat") && (
                            <>
                                <div className="flex-none p-4 pb-2 z-20 bg-[var(--bg-main)]">
                                    <div className="relative">
                                        <input type="text" className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-full px-10 py-2.5 text-xs shadow-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none" placeholder="Cari Santri / Label..." value={forms.search} onChange={e => setForms(p => ({ ...p, search: e.target.value }))} />
                                        <Icon name="Search" className="absolute left-4 top-1/2 -translate-y-2 w-4 h-4 text-[var(--text-muted)]" />
                                        {forms.search && <button onClick={() => setForms(p => ({ ...p, search: "" }))} className="absolute right-4 top-1/2 -translate-y-2 text-red-500 font-bold text-xs">✕</button>}
                                    </div>
                                    <TagFilterBar tags={allUniqueTags} selected={forms.filterTags} toggle={toggleFilterTag} />
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pt-0">
                                    <SantriList
                                        filterTazir={ui.tab === "takziran"} groupedLogs={groupedLogs} groupedNotes={groupedNotes}
                                        expanded={expanded} setExpanded={setExpanded} role={ui.role} users={data.users} searchQuery={forms.search}
                                        actions={crud} noteForm={forms.note} setNoteForm={v => setForms(p => ({ ...p, note: v }))} types={data.jenis}
                                        santriData={data.santri} filterTags={forms.filterTags}
                                    />
                                </div>
                            </>
                        )}
                        {ui.tab === "grafik" && <div className="flex-1 overflow-y-auto p-4 custom-scrollbar"><GrafikPage fullLogs={data.logs} startDate={forms.filter.start} endDate={forms.filter.end} setStartDate={v => setForms(p => ({ ...p, filter: { ...p.filter, start: v } }))} setEndDate={v => setForms(p => ({ ...p, filter: { ...p.filter, end: v } }))} isDark={ui.dark} /></div>}
                        {ui.tab === "database" && (
                            <div className="flex flex-col h-full p-4 overflow-hidden">
                                {isAdmin && (
                                    <div className="flex text-[10px] font-bold border-b border-[var(--border)] bg-[var(--bg-sub)] rounded-t-xl overflow-hidden flex-none">
                                        {[{ id: 'users', l: 'MEMBER' }, { id: 'tools', l: 'TOOLS' }, { id: 'santri', l: 'SANTRI' }, { id: 'jenis', l: 'JENIS' }, { id: 'system', l: 'SISTEM' }].map(m => (
                                            <button key={m.id} onClick={() => setUi(p => ({ ...p, batchMode: m.id }))} className={`flex-1 py-4 transition-all ${ui.batchMode === m.id ? "text-blue-600 bg-[var(--bg-card)] border-b-2 border-blue-600" : "text-[var(--text-muted)]"}`}>{m.l} {m.id === 'users' && data.pendingUsers.length > 0 ? "(!)" : ""}</button>
                                        ))}
                                    </div>
                                )}
                                <div className={`p-2 flex-1 overflow-hidden flex flex-col border border-[var(--border)] bg-[var(--bg-card)] ${isAdmin ? 'border-t-0 rounded-b-xl' : 'rounded-xl'}`}>
                                    {(ui.batchMode === "users" && isAdmin) && <div className="flex-1 overflow-y-auto custom-scrollbar"><BatchUsers users={data.users} pending={data.pendingUsers} types={data.jenis} onDel={crud.delMember} onApprove={crud.approveUser} onReject={crud.rejectUser} onUpdateUser={crud.updateUser} onAddManual={crud.addManualUser} /></div>}
                                    {(ui.batchMode === "tools" && isAdmin) && <div className="flex-1 overflow-y-auto custom-scrollbar"><BatchTools types={data.jenis} searchState={forms.daily} setSearch={v => setForms(p => ({ ...p, daily: v }))} onSearch={crud.searchDaily} result={dailyRes.list} selected={dailyRes.selected} setSelected={v => setDailyRes(p => ({ ...p, selected: typeof v === 'function' ? v(p.selected) : v }))} target={forms.batchTarget} setTarget={v => setForms(p => ({ ...p, batchTarget: v }))} onExec={crud.updateBatch} rangeForm={forms.range} setRangeForm={v => setForms(p => ({ ...p, range: v }))} onMigrate={crud.migrateRange} /></div>}
                                    {(!isAdmin || ui.batchMode === "santri") && (
                                        <>
                                            {!isAdmin && <div className="p-3 mb-2 bg-[var(--bg-sub)] text-[var(--text-muted)] text-[10px] rounded border border-[var(--border)] italic">Anda dapat mengedit label/tag pada nama santri.</div>}
                                            <BatchSantri santri={data.santri} form={forms.santri} setForm={v => setForms(p => ({ ...p, santri: v }))} edit={forms.editSantri} setEdit={v => setForms(p => ({ ...p, editSantri: v }))} onAdd={crud.addSantri} onUpdate={crud.updateSantri} onDel={crud.deleteSantri} isAdmin={isAdmin} />
                                        </>
                                    )}
                                    {(ui.batchMode === "jenis" && isAdmin) && (
                                        <BatchJenis jenis={data.jenis} form={forms.jenisInput} setForm={v => setForms(p => ({ ...p, jenisInput: v }))} edit={forms.editJenis} setEdit={v => setForms(p => ({ ...p, editJenis: v }))} onAdd={crud.addJenis} onUpdate={crud.updateJenis} onDel={crud.deleteJenis} />
                                    )}
                                    {(ui.batchMode === "system" && isAdmin) && (
                                        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                                            <div className="bg-[var(--bg-sub)] border border-[var(--border)] rounded-xl p-4 space-y-3"><h3 className="text-xs font-bold uppercase text-cyan-700">Backup & Restore</h3><button onClick={crud.backup} className="w-full bg-cyan-700 text-white font-bold py-3 rounded-lg text-xs uppercase">Download Backup (JSON)</button><div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]"><input type="file" accept=".json" onChange={e => setForms(p => ({ ...p, restoreFile: e.target.files[0] }))} className="text-[10px]" /><button onClick={crud.processRestore} disabled={!forms.restoreFile} className="bg-teal-600 text-white font-bold py-3 rounded-lg text-xs uppercase disabled:opacity-50">Restore Data</button></div></div>
                                            <BatchDanger form={forms.bulkDel} setForm={v => setForms(p => ({ ...p, bulkDel: v }))} onExec={() => exec(() => supabase.from('logs_pelanggaran').delete().gte('tglMelanggar', forms.bulkDel.start).lte('tglMelanggar', forms.bulkDel.end), "Hapus permanen data?")} loading={ui.loading} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-none bg-[var(--bg-header)]/90 backdrop-blur-md border-t border-[var(--border)] flex justify-around items-center h-[56px] z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                {ui.role && <button onClick={() => setUi(p => ({ ...p, tab: 'input' }))} className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${ui.tab === 'input' ? "text-blue-600" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}><div className={`p-1 rounded-full ${ui.tab === 'input' ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}><Icon name="Pen" className="w-5 h-5" strokeWidth={ui.tab === 'input' ? "2.5" : "2"} /></div><span className="text-[9px] font-bold mt-0.5 tracking-wide">Input</span></button>}
                <button onClick={() => setUi(p => ({ ...p, tab: 'takziran' }))} className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${ui.tab === 'takziran' ? "text-blue-600" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}><div className={`p-1 rounded-full ${ui.tab === 'takziran' ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}><Icon name="Tools" className="w-5 h-5" strokeWidth={ui.tab === 'takziran' ? "2.5" : "2"} /></div><span className="text-[9px] font-bold mt-0.5 tracking-wide">Takziran</span></button>
                <button onClick={() => setUi(p => ({ ...p, tab: 'riwayat' }))} className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${ui.tab === 'riwayat' ? "text-blue-600" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}><div className={`p-1 rounded-full ${ui.tab === 'riwayat' ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}><Icon name="List" className="w-5 h-5" strokeWidth={ui.tab === 'riwayat' ? "2.5" : "2"} /></div><span className="text-[9px] font-bold mt-0.5 tracking-wide">Riwayat</span></button>
            </div>
        </div>
    );
}