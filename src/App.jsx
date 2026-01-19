import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { supabase } from "./supabaseClient"; // Pastikan file ini ada
import GrafikPage from "./GrafikPage";

// --- DATA MASTER HARDCODED (Opsional, jika DB kosong) ---
const MASTER_SANTRI_FIX = ["Abidurrohman", "Ahmad", "Danil", "Fajar", "Feri", "Shoni", "Udin", "Wiwik", "Zainuri", "Fathoni", "Falah", "Radit", "Dimas Aji", "Dimas Kurniawan", "Aufal"]; 
const MASTER_JENIS_FIX = ["Jama'ah Subuh", "Jama'ah Maghrib", "Jama'ah Isya", "Ngaji Sore", "Ngaji Malam", "Kegiatan Malam", "Tandzif", "Imam/adzan Subuh", "Imam/adzan Maghrib", "Imam/adzan Isya"];

// --- CONFIG ---
// Masukkan email admin utama di sini
const SUPER_ADMINS = ["daruttauhidpotroyudan@gmail.com", "ma2n13@gmail.com", "email.anda@gmail.com"]; 

const getDate = (d = new Date()) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
const fmtDate = (d) => new Date(d).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "short", day: "numeric" });

// --- ICONS ---
const Icon = memo(({ name, className, ...props }) => {
  const paths = {
    Chevron: "M19 9l-7 7-7-7",
    Menu: "M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z",
    Sun: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
    Moon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
    Logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
  };
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={paths[name]} />
    </svg>
  );
});

// --- SUB-COMPONENTS (Sama seperti sebelumnya, hanya disesuaikan sedikit) ---

const HistoryGrid = memo(({ logs, types }) => {
  const [currDate, setCurrDate] = useState(new Date());

  const changeMonth = (delta) => {
    setCurrDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  };

  const year = currDate.getFullYear();
  const month = currDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = currDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  const currentMonthLogs = useMemo(() => {
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;
    return logs.filter(l => l.tglMelanggar >= startStr && l.tglMelanggar <= endStr);
  }, [logs, year, month, daysInMonth]);

  const cellBase = "h-9 min-w-[2.25rem] flex items-center justify-center border-r border-b border-[var(--border)] text-[10px] font-bold transition-colors";

  return (
    <div className="bg-[var(--bg-card)] rounded-lg overflow-hidden animate-fade-in border border-[var(--border)] select-none">
      <div className="flex justify-between items-center bg-[var(--bg-sub)] p-2 border-b border-[var(--border)]">
        <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition"><Icon name="Chevron" className="w-5 h-5 rotate-90" /></button>
        <span className="font-bold text-sm text-[var(--text-accent)] uppercase tracking-wide">{monthName}</span>
        <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition"><Icon name="Chevron" className="w-5 h-5 -rotate-90" /></button>
      </div>
      <div className="overflow-x-auto custom-scrollbar pb-2">
        <div className="inline-block min-w-full align-middle">
          <div className="flex border-b border-[var(--border)]">
            <div className="sticky left-0 z-20 w-44 min-w-[11rem] bg-[var(--bg-header)] border-r border-[var(--border)] shrink-0 p-2 text-xs font-bold text-[var(--text-muted)] flex items-center shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
              Jenis Pelanggaran
            </div>
            {daysArray.map(d => (
              <div key={d} className={`${cellBase} bg-[var(--bg-header)] text-[var(--text-muted)] w-9`}>{d}</div>
            ))}
          </div>
          {types.map((jenis, idx) => (
            <div key={jenis.id || idx} className="flex border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)]">
              <div className="sticky left-0 z-10 w-44 min-w-[11rem] bg-[var(--bg-card)] border-r border-[var(--border)] shrink-0 px-3 py-1 text-[11px] font-medium leading-tight flex items-center text-[var(--text-main)] shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                {jenis.nama}
              </div>
              {daysArray.map(day => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const violation = currentMonthLogs.find(l => l.jenis === jenis.nama && l.tglMelanggar === dateStr);
                let cellClass = "bg-emerald-600/20 dark:bg-emerald-900/20"; 
                let content = "";
                let title = "Aman";
                if (violation) {
                   const isSudah = violation.statusTazir === "Sudah";
                   cellClass = isSudah ? "bg-amber-500 text-white" : "bg-red-600 text-white shadow-inner";
                   content = isSudah ? "S" : "B";
                   title = `${violation.keterangan || 'Melanggar'} (${violation.statusTazir})`;
                }
                return <div key={day} className={`${cellBase} ${cellClass} w-9 cursor-help`} title={title}>{content}</div>;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

const SantriList = memo(({ filterTazir, groupedLogs, groupedNotes, expanded, setExpanded, role, actions, noteForm, setNoteForm, types }) => {
  const canDelete = role === 'admin';
  const [selectedIds, setSelectedIds] = useState([]);
  
  const list = useMemo(() => Object.keys(groupedLogs).sort().filter(n => !filterTazir || groupedLogs[n].some(l => l.statusTazir === "Belum")), [groupedLogs, filterTazir]);
  const toggleSel = (id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  if (!list.length) return <div className="text-center text-[var(--text-muted)] mt-10 text-sm">Tidak ada data.</div>;

  return (
    <div className="space-y-3 pb-1">
      {list.map(nama => {
        const items = filterTazir ? groupedLogs[nama].filter(l => l.statusTazir === "Belum") : groupedLogs[nama];
        const notes = groupedNotes[nama] || [];
        const sel = items.filter(i => selectedIds.includes(i.id)).map(i => i.id);
        const pelanggaranCount = groupedLogs[nama].filter(l => l.statusTazir === "Belum").length;
        
        return (
          <div key={nama} className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="bg-[var(--bg-header)] p-4 flex justify-between items-center cursor-pointer hover:bg-[var(--bg-hover)] border-b border-[var(--border-subtle)]" onClick={() => setExpanded(p => ({...p, [nama]: !p[nama]}))}>
              <div className="flex-1 mr-2 flex flex-col justify-center">
                <div className="font-bold text-base text-[var(--text-accent)] leading-snug">{nama}</div>
                {canDelete && sel.length > 0 && <div onClick={(e) => { e.stopPropagation(); actions.delMany(sel); setSelectedIds(p => p.filter(id => !sel.includes(id))); }} className="mt-1.5 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded font-bold w-fit animate-pulse cursor-pointer">🗑️ Hapus {sel.length} item</div>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`${pelanggaranCount > 0 ? "bg-red-600" : "bg-green-600"} text-xs min-w-[1.75rem] h-7 px-1 flex items-center justify-center rounded-full text-white font-bold shadow-sm`}>{pelanggaranCount}</span>
                {filterTazir && canDelete && pelanggaranCount > 0 && <button onClick={(e) => actions.tazir(nama, e)} className="text-xs bg-orange-600 text-white px-3 py-1.5 rounded font-bold hover:bg-orange-500 shadow-sm">Takzir</button>}
                <div className="pl-1"><Icon name="Chevron" className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${expanded[nama] ? 'rotate-180' : ''}`} /></div>
              </div>
            </div>
            {expanded[nama] && (
              <div className="bg-[var(--bg-sub)] border-t border-[var(--border)] animate-fade-in">
                {!filterTazir ? (
                    <div className="p-2 space-y-2">
                        <HistoryGrid logs={groupedLogs[nama]} types={types} />
                        <div className="bg-[var(--bg-note)] rounded border border-[var(--border)]">
                            <div className="p-2 text-xs font-bold text-amber-600 uppercase border-b border-[var(--border)] tracking-wider">Catatan Pengasuh</div>
                            {notes.length === 0 && <div className="p-3 text-xs text-[var(--text-muted)] italic">Belum ada catatan.</div>}
                            {notes.map(n => <div key={n.id} className="flex justify-between text-sm text-[var(--text-note)] p-3 border-b border-[var(--border)] last:border-0"><p className="whitespace-pre-wrap leading-relaxed">{n.isi}</p>{canDelete && <button onClick={() => actions.delNote(n.id)} className="text-red-500 font-bold ml-2 text-lg leading-none hover:text-red-700">×</button>}</div>)}
                            <div className="p-2 flex gap-2">
                                <input type="text" placeholder="Tulis catatan..." className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-xs" value={noteForm} onChange={e => setNoteForm(e.target.value)} onKeyDown={e => e.key === 'Enter' && actions.addNote(nama)} />
                                <button onClick={() => actions.addNote(nama)} className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded text-xs font-bold shadow-sm">Add</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--border)] bg-[var(--bg-sub)]">
                        {items.length === 0 && <div className="p-4 text-center text-xs text-green-600 font-bold bg-green-50/50">Tidak ada tanggungan takziran!</div>}
                        {items.map(l => (
                          <div key={l.id} className={`p-3 text-sm flex justify-between items-start hover:bg-[var(--bg-hover)] ${selectedIds.includes(l.id) ? "bg-red-500/10" : ""}`}>
                            {canDelete && <input type="checkbox" className="mr-3 mt-1 w-4 h-4 accent-red-600 shrink-0 cursor-pointer" checked={selectedIds.includes(l.id)} onChange={() => toggleSel(l.id)} />}
                            <div className="flex-1 pr-2">
                              <div className="font-semibold text-[var(--text-main)] text-sm">{l.jenis}</div>
                              <div className="text-xs text-[var(--text-muted)] mt-0.5">{fmtDate(l.tglMelanggar)}</div>
                              {l.keterangan && <div className="mt-1 text-xs text-[var(--text-muted)] italic bg-[var(--bg-input)] px-2 py-1 rounded inline-block border border-[var(--border)]">"{l.keterangan}"</div>}
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${l.statusTazir === 'Sudah' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{l.statusTazir === 'Sudah' ? '✔ Sudah' : '✖ Belum'}</span>
                              {canDelete && <button onClick={() => actions.del(l.id)} className="text-xs text-red-600 border border-red-200 bg-red-50 px-2 py-1 rounded hover:bg-red-100">Hapus</button>}
                            </div>
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

// --- ADMIN COMPONENTS ---
const BatchUsers = memo(({ users, pending, types, onDel, onApprove, onReject, onUpdateAssignment }) => {
    const [editMode, setEditMode] = useState(null);
    const [tempAssign, setTempAssign] = useState([]);
    const [tab, setTab] = useState("active");

    const handleEdit = (u) => { setEditMode(u.id); setTempAssign(u.assignedTypes || []); };
    const saveEdit = () => { onUpdateAssignment(editMode, tempAssign); setEditMode(null); }

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex gap-2 border-b border-[var(--border)] mb-2">
                <button onClick={() => setTab("active")} className={`px-4 py-2 text-sm font-bold border-b-2 transition ${tab === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent text-[var(--text-muted)]'}`}>Active ({users.length})</button>
                <button onClick={() => setTab("pending")} className={`px-4 py-2 text-sm font-bold border-b-2 transition ${tab === 'pending' ? 'border-amber-600 text-amber-600' : 'border-transparent text-[var(--text-muted)]'}`}>Pending ({pending.length})</button>
            </div>
            {tab === "active" && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg h-[60vh] overflow-y-auto custom-scrollbar divide-y divide-[var(--border)]">
                    {users.map(u => (
                        <div key={u.id} className="p-3 hover:bg-[var(--bg-hover)]">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-bold text-sm text-[var(--text-main)]">{u.nickname || u.email}</div>
                                    <div className="text-[10px] text-[var(--text-muted)]">{u.email}</div>
                                    <div className={`text-[10px] uppercase font-bold mt-1 inline-block px-1.5 rounded ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</div>
                                </div>
                                <div className="flex gap-2">
                                    {editMode === u.id ? (
                                        <>
                                            <button onClick={saveEdit} className="text-green-600 font-bold text-xs border border-green-200 bg-green-50 px-2 py-1 rounded">Simpan</button>
                                            <button onClick={() => setEditMode(null)} className="text-gray-500 font-bold text-xs border border-gray-200 bg-gray-50 px-2 py-1 rounded">Batal</button>
                                        </>
                                    ) : (
                                        <>
                                            {u.role !== 'admin' && <button onClick={() => handleEdit(u)} className="text-blue-500 text-xs px-2 py-1">✏️ Tugas</button>}
                                            {!SUPER_ADMINS.includes(u.email) && <button onClick={() => onDel(u.id)} className="text-red-500 text-xs px-2 py-1">Hapus</button>}
                                        </>
                                    )}
                                </div>
                            </div>
                            {u.role !== 'admin' && (
                                <div className={`p-2 rounded border border-[var(--border)] text-xs transition-colors ${editMode === u.id ? "bg-blue-50/50 border-blue-200" : "bg-[var(--bg-sub)]"}`}>
                                    <span className="font-bold block mb-1 text-[var(--text-muted)]">Tugas Input:</span>
                                    {editMode === u.id ? (
                                        <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto custom-scrollbar">
                                            {types.map(j => (
                                                <label key={j.id} className="flex items-center gap-2 p-1 hover:bg-[var(--bg-hover)] rounded cursor-pointer">
                                                    <input type="checkbox" checked={tempAssign.includes(j.nama)} onChange={e => {
                                                        if(e.target.checked) setTempAssign([...tempAssign, j.nama]);
                                                        else setTempAssign(tempAssign.filter(x => x !== j.nama));
                                                    }} className="accent-blue-600" />
                                                    {j.nama}
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-1">
                                            {u.assignedTypes && u.assignedTypes.length > 0 ? u.assignedTypes.map(t => (
                                                <span key={t} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">{t}</span>
                                            )) : <span className="text-[var(--text-muted)] italic">Belum ada tugas spesifik (Bisa semua).</span>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {tab === "pending" && (
                <div className="space-y-3">
                    {pending.length === 0 && <div className="text-center text-[var(--text-muted)] py-4 text-sm">Tidak ada permintaan.</div>}
                    {pending.map(p => (
                        <div key={p.id} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-3 rounded-lg shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-amber-900 dark:text-amber-100 text-sm">{p.nickname}</div>
                                    <div className="text-xs text-amber-700/80">{p.email}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onApprove(p)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold shadow-sm">Terima</button>
                                    <button onClick={() => onReject(p.id)} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold shadow-sm">Tolak</button>
                                </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-amber-200/50">
                                <span className="text-[10px] font-bold uppercase text-amber-800/70 block mb-1">Request Tugas:</span>
                                <div className="flex flex-wrap gap-1">
                                    {p.assignedTypes && p.assignedTypes.map(t => (
                                        <span key={t} className="text-[10px] bg-white border border-amber-200 px-1.5 rounded">{t}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

const RegForm = ({ user, types, onSubmit }) => {
    const [form, setForm] = useState({ nickname: user.displayName || "", assignedTypes: [] });
    const toggleType = (t) => setForm(p => ({...p, assignedTypes: p.assignedTypes.includes(t) ? p.assignedTypes.filter(x=>x!==t) : [...p.assignedTypes, t]}));
    
    return (
        <div className="fixed inset-0 z-[60] bg-[var(--bg-main)] flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-[var(--border)]">
                    <h2 className="text-xl font-bold text-[var(--text-accent)]">Pendaftaran Petugas</h2>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Lengkapi data untuk mengajukan akses.</p>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-[var(--text-muted)] block mb-1">Email</label>
                        <input type="text" disabled value={user.email} className="w-full bg-[var(--bg-sub)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-muted)]" />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-[var(--text-muted)] block mb-1">Nama Panggilan</label>
                        <input type="text" value={form.nickname} onChange={e => setForm({...form, nickname: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 py-2 text-sm font-bold text-[var(--text-main)] focus:border-blue-500 outline-none" placeholder="Contoh: Kang Budi" />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-[var(--text-muted)] block mb-2">Tugas Input (Jenis Pelanggaran)</label>
                        <div className="grid grid-cols-1 gap-2 bg-[var(--bg-sub)] p-3 rounded border border-[var(--border)] max-h-60 overflow-y-auto custom-scrollbar">
                            {types.map(t => (
                                <label key={t.id} className="flex items-center gap-3 cursor-pointer hover:bg-[var(--bg-hover)] p-1.5 rounded transition">
                                    <input type="checkbox" checked={form.assignedTypes.includes(t.nama)} onChange={() => toggleType(t.nama)} className="w-4 h-4 accent-blue-600 rounded" />
                                    <span className="text-sm text-[var(--text-main)]">{t.nama}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-sub)]">
                    <button onClick={() => onSubmit(form)} disabled={!form.nickname || form.assignedTypes.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-lg">KIRIM PERMINTAAN</button>
                    <button onClick={() => supabase.auth.signOut()} className="w-full mt-2 text-red-500 font-bold text-sm hover:underline">Batal / Logout</button>
                </div>
            </div>
        </div>
    );
};

export default function App() {
  const [ui, setUi] = useState({ user: null, role: null, dbUser: null, isPending: false, tab: "takziran", menu: false, loading: false, toast: null, dark: localStorage.getItem("theme") !== "light", batchMode: "daily", backupMode: "download" });
  const [data, setData] = useState({ santri: [], jenis: [], logs: [], catatan: [], users: [], pendingUsers: [] });
  const [forms, setForms] = useState({ 
    input: { jenis: "", date: getDate(), students: [], isTazir: "Belum", keterangan: "" }, 
    note: "", santri: "", editSantri: null, csv: "", restoreFile: null,
    filter: { start: getDate(new Date(Date.now() - 30*864e5)), end: getDate() },
    bulkDel: { start: getDate(), end: getDate() },
    daily: { date: getDate(), jenis: "" },
    batchTarget: { newJenis: "", newDate: "" },
    range: { start: getDate(new Date(Date.now() - 7*864e5)), end: getDate(), oldJenis: "", newJenis: "" }
  });
  const [expanded, setExpanded] = useState({});
  const [dailyRes, setDailyRes] = useState({ list: [], selected: [] });

  // --- SUPABASE FETCHING ---
  const fetchData = useCallback(async () => {
    setUi(p => ({...p, loading: true}));
    
    // Helper to fetch table
    const get = async (table, orderCol) => {
        const { data, error } = await supabase.from(table).select('*').order(orderCol || 'id', {ascending: true});
        return error ? [] : data;
    };
    
    // Logs need descending order by date usually
    const { data: logsData } = await supabase.from('logs_pelanggaran').select('*').order('tglMelanggar', {ascending: false});
    const { data: catData } = await supabase.from('santri_catatan').select('*').order('createdAt', {ascending: false});

    setData(p => ({
        ...p,
        santri: (await get('master_santri', 'nama')) || [],
        jenis: (await get('master_jenis', 'nama')) || [],
        users: (await get('manage_users', 'email')) || [],
        pendingUsers: (await get('users_pending', 'createdAt')) || [],
        logs: logsData || [],
        catatan: catData || []
    }));
    setUi(p => ({...p, loading: false}));
  }, []);

  // --- REALTIME SUBSCRIPTION ---
  useEffect(() => {
    fetchData(); // Initial load

    // Listen to changes in all relevant tables
    const channels = ['master_santri', 'master_jenis', 'logs_pelanggaran', 'santri_catatan', 'manage_users', 'users_pending'].map(table => {
        return supabase.channel(`public:${table}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: table }, () => {
                fetchData(); // Simplest strategy: refetch all on change
            })
            .subscribe();
    });

    return () => {
        channels.forEach(c => supabase.removeChannel(c));
    };
  }, [fetchData]);

  // --- AUTH & DARK MODE ---
  useEffect(() => { document.body.classList.toggle('dark-mode', ui.dark); }, [ui.dark]);
  
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
       const u = session?.user;
       if (!u) {
           setUi(p => ({ ...p, user: null, role: null, dbUser: null, isPending: false }));
           return;
       }

       let role = null;
       let dbUser = null;
       let isPending = false;
       
       if (SUPER_ADMINS.includes(u.email)) {
           role = "admin";
           dbUser = { email: u.email, role: 'admin', nickname: 'Super Admin' };
       } else {
           // We need to check users from state, but state might not be loaded yet if first render
           // Ideally we query the DB specifically for this user here
           supabase.from('manage_users').select('*').eq('email', u.email).single().then(({ data: found }) => {
                if (found) {
                    setUi(p => ({ ...p, user: u, role: found.role, dbUser: found }));
                } else {
                    supabase.from('users_pending').select('*').eq('email', u.email).single().then(({ data: pending }) => {
                        setUi(p => ({ ...p, user: u, role: null, dbUser: null, isPending: !!pending }));
                    });
                }
           });
           return; // Async handled above
       }
       setUi(p => ({ ...p, user: u, role, dbUser, isPending }));
    });

    return () => authListener.subscription.unsubscribe();
  }, [data.users]); // Dependency on users to re-check role if users list updates

  const showToast = useCallback((msg) => { setUi(p => ({...p, toast: msg})); setTimeout(() => setUi(p => ({...p, toast: null})), 3000); }, []);
  
  const exec = useCallback(async (fn, confirmMsg) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setUi(p => ({...p, loading: true}));
    try { await fn(); } catch (e) { alert(e.message); }
    setUi(p => ({...p, loading: false}));
  }, []);

  // --- CRUD OPERATIONS (SUPABASE) ---
  const crud = useMemo(() => ({
    save: (e) => { 
      e.preventDefault(); 
      if (!forms.input.jenis || !forms.input.students.length) return alert("Pilih data!");
      exec(async () => {
        const payload = forms.input.students.map(nama => ({
            nama, 
            jenis: forms.input.jenis, 
            tglMelanggar: forms.input.date, 
            statusTazir: forms.input.isTazir, 
            keterangan: forms.input.keterangan, 
            createdAt: new Date().toISOString()
        }));
        
        const { error } = await supabase.from('logs_pelanggaran').insert(payload);
        if (error) throw error;

        setForms(p => ({ ...p, input: { ...p.input, students: [], keterangan: "" } })); 
        showToast("✅ Berhasil Simpan");
      });
    },
    delMany: (ids) => exec(async () => { 
        const { error } = await supabase.from('logs_pelanggaran').delete().in('id', ids);
        if (error) throw error;
        showToast("Terhapus"); 
    }, `Hapus ${ids.length} data?`),

    tazir: (nama, e) => { 
        e.stopPropagation(); 
        exec(async () => { 
            // Update where nama = nama AND status = Belum
            const { error } = await supabase.from('logs_pelanggaran')
                .update({ statusTazir: "Sudah" })
                .eq('nama', nama)
                .eq('statusTazir', 'Belum');
            if (error) throw error;
            showToast("Di-ta'zir"); 
        }); 
    },

    addNote: (nama) => { 
        if(forms.note.trim()) exec(async () => { 
            const { error } = await supabase.from('santri_catatan').insert([{ nama, isi: forms.note, createdAt: new Date().toISOString() }]);
            if (error) throw error;
            setForms(p => ({...p, note: ""})); showToast("Catatan +"); 
        }); 
    },

    updateBatch: (action) => {
      if(!dailyRes.selected.length) return alert("Pilih data!");
      exec(async () => { 
        if (action === 'delete') {
            await supabase.from('logs_pelanggaran').delete().in('id', dailyRes.selected);
        } else {
            await supabase.from('logs_pelanggaran').update({ jenis: forms.batchTarget.newJenis, tglMelanggar: forms.batchTarget.newDate }).in('id', dailyRes.selected);
        }
        showToast("Sukses"); setDailyRes({ list: [], selected: [] }); 
      }, `${action} ${dailyRes.selected.length} data?`);
    },

    searchDaily: async () => { 
        if(!forms.daily.jenis) return alert("Pilih jenis!"); 
        const { data: res } = await supabase.from('logs_pelanggaran').select('*').eq("tglMelanggar", forms.daily.date).eq("jenis", forms.daily.jenis);
        setDailyRes({ list: res || [], selected: (res || []).map(r => r.id) }); 
        setForms(p => ({...p, batchTarget: { newJenis: forms.daily.jenis, newDate: forms.daily.date }})); 
        if(!res?.length) showToast("Nihil"); 
    },

    backup: () => { 
        const link = document.createElement("a"); 
        link.href = URL.createObjectURL(new Blob([JSON.stringify({ collections: { master_santri: data.santri, master_jenis: data.jenis, logs_pelanggaran: data.logs, santri_catatan: data.catatan }}, null, 2)], {type: "application/json"})); 
        link.download = `backup_${getDate()}.json`; link.click(); 
    },

    // --- RESTORE DARI FIREBASE JSON ---
    processRestore: () => { 
        const file = forms.restoreFile; 
        if (!file) return; 
        
        exec(async () => { 
            const text = await file.text();
            const json = JSON.parse(text); 
            
            // Helper to convert Firebase timestamp to ISO
            const toISO = (ts) => {
                if (!ts) return new Date().toISOString();
                if (ts.seconds) return new Date(ts.seconds * 1000).toISOString();
                if (typeof ts === 'string') return ts; // Already string
                return new Date().toISOString();
            }

            // Upload Batches (Supabase handles bulk insert well)
            // 1. Santri
            if (json.collections.master_santri) {
                const santriPayload = json.collections.master_santri.map(x => ({ id: x.id, nama: x.nama }));
                await supabase.from('master_santri').upsert(santriPayload);
            }
            // 2. Jenis
            if (json.collections.master_jenis) {
                const jenisPayload = json.collections.master_jenis.map(x => ({ id: x.id, nama: x.nama }));
                await supabase.from('master_jenis').upsert(jenisPayload);
            }
            // 3. Logs (Hati-hati timestamp)
            if (json.collections.logs_pelanggaran) {
                const logsPayload = json.collections.logs_pelanggaran.map(x => ({
                    id: x.id,
                    nama: x.nama,
                    jenis: x.jenis,
                    tglMelanggar: x.tglMelanggar,
                    statusTazir: x.statusTazir,
                    keterangan: x.keterangan,
                    createdAt: toISO(x.createdAt)
                }));
                // Insert in chunks of 500 to be safe
                for (let i = 0; i < logsPayload.length; i += 500) {
                     await supabase.from('logs_pelanggaran').upsert(logsPayload.slice(i, i + 500));
                }
            }
            // 4. Catatan
            if (json.collections.santri_catatan) {
                const catPayload = json.collections.santri_catatan.map(x => ({
                    id: x.id,
                    nama: x.nama,
                    isi: x.isi,
                    createdAt: toISO(x.createdAt)
                }));
                 await supabase.from('santri_catatan').upsert(catPayload);
            }

            showToast(`Restore Berhasil!`); 
            setForms(p => ({...p, restoreFile: null})); 
            fetchData();
        }, "Tutup data lama? Data ID yang sama akan ditimpa."); 
    },

    bulkDeleteRange: () => exec(async () => { 
        const { start, end } = forms.bulkDel; 
        const { error } = await supabase.from('logs_pelanggaran').delete().gte('tglMelanggar', start).lte('tglMelanggar', end);
        if (error) throw error;
        showToast("Terhapus"); 
    }, `Hapus ${forms.bulkDel.start} - ${forms.bulkDel.end}?`),

    migrateRange: () => { 
        const { start, end, oldJenis, newJenis } = forms.range; 
        if(!oldJenis || !newJenis) return; 
        exec(async () => { 
            const { error } = await supabase.from('logs_pelanggaran')
                .update({ jenis: newJenis })
                .gte('tglMelanggar', start)
                .lte('tglMelanggar', end)
                .eq('jenis', oldJenis);
            if (error) throw error;
            showToast(`Sukses Migrasi`); 
        }, "Ganti semua?"); 
    },

    addSantri: () => { if (forms.santri.trim()) exec(async () => { await supabase.from('master_santri').insert([{ nama: forms.santri }]); setForms(p => ({ ...p, santri: "" })); showToast("Santri +"); }); },
    updateSantri: () => { if (forms.editSantri?.nama.trim()) exec(async () => { await supabase.from('master_santri').update({ nama: forms.editSantri.nama }).eq('id', forms.editSantri.id); setForms(p => ({ ...p, editSantri: null })); showToast("Updated"); }); },
    deleteSantri: (id) => exec(async () => { await supabase.from('master_santri').delete().eq('id', id); showToast("Deleted"); }, "Hapus?"),
    delUser: (id) => exec(async () => { await supabase.from('manage_users').delete().eq('id', id); showToast("Member -"); }, "Hapus?"),
    
    submitReg: (formData) => exec(async () => {
        await supabase.from('users_pending').insert([{
            email: ui.user.email,
            uid: ui.user.id,
            nickname: formData.nickname,
            assignedTypes: formData.assignedTypes,
            createdAt: new Date().toISOString()
        }]);
        showToast("Menunggu Persetujuan Admin");
    }),
    approveUser: (userData) => exec(async () => {
        await supabase.from('manage_users').insert([{
            email: userData.email,
            role: "pengurus",
            nickname: userData.nickname,
            assignedTypes: userData.assignedTypes || []
        }]);
        await supabase.from('users_pending').delete().eq('id', userData.id);
        showToast("User Disetujui");
    }),
    rejectUser: (id) => exec(async () => {
        await supabase.from('users_pending').delete().eq('id', id);
        showToast("User Ditolak");
    }, "Tolak permintaan ini?"),
    updateUserAssignment: (userId, newTypes) => exec(async () => {
        await supabase.from('manage_users').update({ assignedTypes: newTypes }).eq('id', userId);
        showToast("Tugas Diupdate");
    }),
    
    resetMasterData: () => exec(async () => {
        // Delete All first
        await supabase.from('master_santri').delete().neq('id', '000000'); // Delete all (hackish way neq something impossible)
        await supabase.from('master_jenis').delete().neq('id', '000000');
        
        // Insert new
        await supabase.from('master_santri').insert(MASTER_SANTRI_FIX.map(nama => ({ nama })));
        await supabase.from('master_jenis').insert(MASTER_JENIS_FIX.map(nama => ({ nama })));
        showToast("Master Data Reset!");
    }, "PERINGATAN: Menghapus semua santri & jenis, ganti dengan hardcoded. Lanjut?")
  }), [forms, dailyRes, data, exec, showToast, ui.user]);

  const groupedLogs = useMemo(() => data.logs.reduce((acc, cur) => { (acc[cur.nama] = acc[cur.nama] || []).push(cur); return acc; }, {}), [data.logs]);
  const groupedNotes = useMemo(() => data.catatan.reduce((acc, cur) => { (acc[cur.nama] = acc[cur.nama] || []).push(cur); return acc; }, {}), [data.catatan]);

  const isAdmin = ui.role === 'admin';
  const isPetugas = ui.role === 'pengurus';
  const canInput = isAdmin || isPetugas;

  // Filter jenis based on user assignment
  const inputTypes = useMemo(() => {
    if (isAdmin) return data.jenis;
    if (isPetugas && ui.dbUser?.assignedTypes?.length > 0) {
        return data.jenis.filter(j => ui.dbUser.assignedTypes.includes(j.nama));
    }
    return data.jenis; 
  }, [data.jenis, isAdmin, isPetugas, ui.dbUser]);

  // LOGIN FLOW HANDLING
  if (ui.user && !ui.dbUser) {
      if (ui.isPending) {
          return (
              <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-main)] text-[var(--text-main)] gap-4 animate-fade-in text-center p-6">
                  <div className="text-4xl">⏳</div>
                  <h1 className="text-xl font-bold">Menunggu Persetujuan Admin</h1>
                  <p className="text-sm opacity-70">Permintaan akses Anda sedang ditinjau.<br/>Notifikasi akan muncul di dashboard admin.</p>
                  <button onClick={() => supabase.auth.signOut()} className="text-red-500 font-bold underline text-sm">Logout</button>
              </div>
          );
      }
      return <RegForm user={ui.user} types={data.jenis} onSubmit={crud.submitReg} />;
  }

  return (
    <div className="h-[100dvh] bg-[var(--bg-main)] text-[var(--text-main)] font-sans flex flex-col overflow-hidden" onClick={() => setUi(p => ({...p, menu: false}))}>
      <div className="flex-none bg-[var(--bg-header)] px-4 py-3 border-b border-[var(--border)] z-50 shadow-md flex justify-between items-center h-[64px]">
        <h1 className="text-xl font-bold text-[var(--text-accent)] tracking-tight">Takziran App (Supa)</h1>
        <div className="flex gap-3 relative">
          <button onClick={(e) => { e.stopPropagation(); setUi(p => ({...p, dark: !p.dark})); localStorage.setItem("theme", !ui.dark ? "dark" : "light"); }} className="p-2 rounded-full hover:bg-[var(--bg-hover)] transition"><Icon name={ui.dark ? "Moon" : "Sun"} className="w-6 h-6 text-yellow-500" /></button>
          <button onClick={(e) => { e.stopPropagation(); setUi(p => ({...p, menu: !p.menu})); }} className="p-2 rounded-full hover:bg-[var(--bg-hover)] transition relative">
            <Icon name="Menu" className="w-6 h-6 text-[var(--text-main)]" />
            {data.pendingUsers.length > 0 && isAdmin && <span className="absolute top-1 right-1 w-3 h-3 bg-red-600 rounded-full border border-white animate-pulse"></span>}
          </button>
          {ui.menu && (
              <div className="absolute right-0 top-12 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl py-2 z-50 animate-fade-in">
                  {['grafik', 'admin'].filter(t => t !== 'admin' || isAdmin).map(t => (
                      <button key={t} onClick={() => setUi(p => ({...p, tab: t}))} className="w-full text-left px-5 py-3 hover:bg-[var(--bg-hover)] capitalize text-sm font-medium flex justify-between">
                          {t}
                          {t === 'admin' && data.pendingUsers.length > 0 && <span className="bg-red-600 text-white text-[10px] px-1.5 rounded-full flex items-center">{data.pendingUsers.length}</span>}
                      </button>
                  ))}
                  <div className="border-t border-[var(--border)] my-1"></div>
                  <button onClick={() => { ui.user ? supabase.auth.signOut() : supabase.auth.signInWithOAuth({provider: 'google'}); setUi(p => ({...p, menu: false})); }} className={`w-full text-left px-5 py-3 text-sm font-bold flex items-center gap-2 ${ui.user ? "text-red-500" : "text-green-600"}`}>
                      <Icon name="Logout" className="w-4 h-4" /> {ui.user ? "Logout" : "Login Google"}
                  </button>
                  {ui.user && <div className="px-5 py-1 text-[10px] text-[var(--text-muted)] border-t border-[var(--border)] mt-1 pt-2">{ui.user.email}<br/><span className="uppercase font-bold text-[var(--text-accent)]">{ui.role === 'admin' ? 'Admin' : 'Petugas'}</span></div>}
              </div>
          )}
        </div>
      </div>
      
      {ui.toast && <div className="absolute top-20 inset-x-0 z-[100] flex justify-center pointer-events-none px-4"><div className="bg-green-600 text-white px-5 py-3 rounded-lg shadow-2xl font-bold text-sm animate-bounce text-center">{ui.toast}</div></div>}
      
      <div className="flex-1 w-full max-w-lg mx-auto overflow-hidden relative">
        <div className="h-full w-full overflow-y-auto pb-4 px-4 pt-4 custom-scrollbar">
          {canInput && ui.tab === "input" ? (
            <form onSubmit={crud.save} className="flex flex-col h-full gap-2">
              <div className="flex flex-col gap-2 bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border)] shadow-sm h-full overflow-hidden">
                <div className="flex flex-col gap-2 shrink-0">
                    <select className="input-field py-2.5 px-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm w-full outline-none focus:border-blue-500 transition" value={forms.input.jenis} onChange={e => setForms(p => ({...p, input: {...p.input, jenis: e.target.value}}))}>
                      <option value="">-- Pilih Jenis Pelanggaran --</option>
                      {inputTypes.map(j => (
                            <option key={j.id} value={j.nama}>{j.nama}</option>
                      ))}
                    </select>
                    <div className="flex gap-2 h-10 w-full">
                        <input type="date" className="input-field px-2 h-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-xs flex-[4]" value={forms.input.date} onChange={e => setForms(p => ({...p, input: {...p.input, date: e.target.value}}))} />
                        <div className="flex-[3] flex gap-1 h-full bg-[var(--bg-input)] px-1 rounded-lg border border-[var(--border)] items-center justify-center">
                          {["Belum", "Sudah"].map(v => <label key={v} className="flex items-center gap-1 cursor-pointer px-1"><input type="radio" name="st" value={v} checked={forms.input.isTazir === v} onChange={e => setForms(p => ({...p, input: {...p.input, isTazir: e.target.value}}))} className="w-3 h-3 accent-blue-600" /><span className={`font-bold text-[10px] uppercase ${v === 'Sudah' ? 'text-green-600' : 'text-red-600'}`}>{v}</span></label>)}
                        </div>
                    </div>
                    <textarea className="input-field h-10 py-1.5 px-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg resize-none text-xs placeholder:text-gray-400 focus:h-16 transition-all" placeholder="Keterangan tambahan..." value={forms.input.keterangan} onChange={e => setForms(p => ({...p, input: {...p.input, keterangan: e.target.value}}))} />
                </div>
                <div className="flex-1 bg-[var(--bg-sub)] rounded-lg border border-[var(--border)] p-2 custom-scrollbar overflow-y-auto min-h-0">
                    <div className="grid grid-cols-2 gap-2">
                      {data.santri.map(s => {
                        const isSelected = forms.input.students.includes(s.nama);
                        return (
                          <div key={s.id} onClick={() => setForms(p => ({...p, input: {...p.input, students: isSelected ? p.input.students.filter(x => x !== s.nama) : [...p.input.students, s.nama]}}))} className={`p-2 rounded-md text-[11px] sm:text-xs cursor-pointer text-center transition border select-none ${isSelected ? "bg-blue-600 border-blue-600 text-white font-bold shadow-md ring-2 ring-blue-300 dark:ring-blue-800" : "bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-hover)]"}`}>{isSelected && "✓ "} {s.nama}</div>
                        )
                      })}
                    </div>
                </div>
                <button disabled={ui.loading} className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-3 rounded-xl font-bold shadow-md text-sm transition-transform uppercase tracking-wider shrink-0">{ui.loading ? "..." : "SIMPAN DATA"}</button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {(ui.tab === "takziran" || ui.tab === "riwayat") && (
                <SantriList 
                  filterTazir={ui.tab === "takziran"} 
                  groupedLogs={groupedLogs} 
                  groupedNotes={groupedNotes} 
                  expanded={expanded} 
                  setExpanded={setExpanded} 
                  role={ui.role} 
                  actions={{ 
                      tazir: crud.tazir, 
                      del: id => exec(() => supabase.from('logs_pelanggaran').delete().eq('id', id), "Hapus?"), 
                      delMany: crud.delMany, 
                      addNote: crud.addNote, 
                      delNote: id => exec(() => supabase.from('santri_catatan').delete().eq('id', id), "Hapus catatan?") 
                  }} 
                  noteForm={forms.note} 
                  setNoteForm={v => setForms(p => ({...p, note: v}))} 
                  types={data.jenis} 
                />
              )}
              {ui.tab === "grafik" && <GrafikPage fullLogs={data.logs} startDate={forms.filter.start} endDate={forms.filter.end} setStartDate={v => setForms(p => ({...p, filter: {...p.filter, start: v}}))} setEndDate={v => setForms(p => ({...p, filter: {...p.filter, end: v}}))} isDark={ui.dark} />}
              {isAdmin && ui.tab === "admin" && (
                <div className="space-y-6">
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
                    <div className="flex text-xs font-bold border-b border-[var(--border)] bg-[var(--bg-sub)]">
                      {[{id:'daily',l:'Koreksi'},{id:'users',l:`Member${data.pendingUsers.length?' (!)':''}`},{id:'santri',l:'Santri'},{id:'range',l:'Migrasi'}].map(m => <button key={m.id} onClick={() => setUi(p => ({...p, batchMode: m.id}))} className={`flex-1 py-3.5 transition ${ui.batchMode===m.id ? "text-blue-600 bg-white border-b-2 border-blue-600" : "text-[var(--text-muted)]"}`}>{m.l}</button>)}
                    </div>
                    <div className="p-4 bg-[var(--bg-card)]">
                      {ui.batchMode === "daily" && <BatchDaily types={data.jenis} searchState={forms.daily} setSearch={v => setForms(p => ({...p, daily: v}))} onSearch={crud.searchDaily} result={dailyRes.list} selected={dailyRes.selected} setSelected={v => setDailyRes(p => ({...p, selected: typeof v === 'function' ? v(p.selected) : v}))} target={forms.batchTarget} setTarget={v => setForms(p => ({...p, batchTarget: v}))} onExec={crud.updateBatch} />}
                      {ui.batchMode === "santri" && <BatchSantri santri={data.santri} form={forms.santri} setForm={v => setForms(p => ({...p, santri: v}))} edit={forms.editSantri} setEdit={v => setForms(p => ({...p, editSantri: v}))} onAdd={crud.addSantri} onUpdate={crud.updateSantri} onDel={crud.deleteSantri} />}
                      {ui.batchMode === "users" && <BatchUsers users={data.users} pending={data.pendingUsers} types={data.jenis} onDel={crud.delUser} onApprove={crud.approveUser} onReject={crud.rejectUser} onUpdateAssignment={crud.updateUserAssignment} />}
                      {ui.batchMode === "range" && <div className="space-y-4 animate-fade-in"><div className="grid grid-cols-2 gap-3">{['start','end'].map(k => <div key={k}><label className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1 block">{k === 'start' ? 'Dari' : 'Sampai'}</label><input type="date" className="input-field w-full py-2.5 px-3 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-lg" value={forms.range[k]} onChange={e => setForms(p => ({...p, range: {...p.range, [k]: e.target.value}}))} /></div>)}</div><div className="space-y-3">{[{k:'oldJenis',l:'Jenis Lama'},{k:'newJenis',l:'Jenis Baru'}].map(f => <div key={f.k}><label className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1 block">{f.l}</label><select className="input-field w-full py-2.5 px-3 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded-lg" value={forms.range[f.k]} onChange={e => setForms(p => ({...p, range: {...p.range, [f.k]: e.target.value}}))}><option value="">-- Pilih --</option>{data.jenis.map(j => <option key={j.id} value={j.nama}>{j.nama}</option>)}</select></div>)}</div><button onClick={crud.migrateRange} className="w-full bg-amber-600 text-white py-3 rounded-lg font-bold mt-2 text-sm">EKSEKUSI</button></div>}
                    </div>
                  </div>
                  
                  {/* RESTORE AREA */}
                  <div className="bg-[var(--bg-card)] border border-cyan-700/30 rounded-xl overflow-hidden shadow-sm">
                     <div className="flex text-xs font-bold border-b border-cyan-700/20 bg-cyan-50/50">
                       <button onClick={() => setUi(p => ({...p, backupMode: "download"}))} className={`flex-1 py-3 ${ui.backupMode==="download"?"text-cyan-700 bg-cyan-100/50":"text-[var(--text-muted)]"}`}>Backup</button>
                       <button onClick={() => setUi(p => ({...p, backupMode: "restore"}))} className={`flex-1 py-3 ${ui.backupMode==="restore"?"text-cyan-700 bg-cyan-100/50":"text-[var(--text-muted)]"}`}>Restore (JSON)</button>
                     </div>
                     <div className="p-4 bg-[var(--bg-card)] text-center">
                       {ui.backupMode === "download" ? (
                         <button onClick={crud.backup} className="w-full bg-cyan-700 text-white font-bold py-3 rounded-lg text-sm">DOWNLOAD JSON</button> 
                       ) : (
                         <div className="space-y-3">
                           <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200">
                               <strong>PENTING:</strong> Gunakan file <code>backup_...json</code> dari Firebase lama Anda. Sistem akan otomatis mengkonversi format waktunya.
                           </div>
                           <input type="file" accept=".json" onChange={e => setForms(p => ({...p, restoreFile: e.target.files[0]}))} className="block w-full text-xs" />
                           <button onClick={crud.processRestore} disabled={!forms.restoreFile} className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg text-sm">RESTORE DATA LAMA</button>
                         </div>
                       )}
                     </div>
                  </div>

                  <BatchDanger form={forms.bulkDel} setForm={v => setForms(p => ({...p, bulkDel: v}))} onExec={crud.bulkDeleteRange} loading={ui.loading} onResetMaster={crud.resetMasterData} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-none w-full bg-[var(--bg-header)] border-t border-[var(--border)] flex justify-around items-center h-[65px] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {canInput && (
          <button onClick={() => setUi(p => ({...p, tab: 'input'}))} className={`flex flex-col items-center justify-center w-full h-full ${ui.tab==='input' ? "text-blue-600" : "text-[var(--text-muted)]"}`}>
            <span className="text-xl mb-0.5">📝</span><span className="text-[11px] font-bold">Input</span>
          </button>
        )}
        {['takziran', 'riwayat'].map(t => (
          <button key={t} onClick={() => setUi(p => ({...p, tab: t}))} className={`flex flex-col items-center justify-center w-full h-full ${ui.tab===t ? "text-blue-600" : "text-[var(--text-muted)]"}`}>
            <span className="text-xl mb-0.5">{t === 'takziran' ? '⚠️' : '📜'}</span><span className="text-[11px] font-bold capitalize">{t}</span>
          </button>
        ))}
      </div>
    </div>
  );
}