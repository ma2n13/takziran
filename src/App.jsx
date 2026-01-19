import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { db, auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, orderBy, serverTimestamp, writeBatch, doc, where, getDocs, deleteDoc, addDoc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import GrafikPage from "./GrafikPage";

// --- DATA MASTER BARU (FIXED) ---
const MASTER_SANTRI_FIX = [
  "Abidurrohman", "Achmad Romatullah Asy Syahir", "Afif Ali Mansyur", "Ahmad", "Ahmad Aniq Munir",
  "Ahmad Faris A'lauddin", "Ahmad Firiham", "Ahmad Hanaan Badar", "Ahmad Ilham Rizki", "Ahmad Malik Ibrahim",
  "Ahmad Muhammad Akaais T", "Ahmad Rifandi Julianto", "Ahmad Sheva Alfarisi", "Ahmad Syafiqul Anwar",
  "Ahmad Syahrul Khamdi", "Alfan Ni'am", "Alfan Okta Prasetia", "Ali", "Andan Juandistira",
  "Anugrah Nur Lillahi Akbar", "Arsyad (Dalwa)", "Asyraf Faeyza Alsyafaraz", "Aufal", "Azka Naja",
  "Bagus Adi Prayoga", "Bilal Nazhifa Dzakiy", "Catur Seno Prayogo", "Danil", "Davin Defriza",
  "Deni Oktafiano Putra", "Dian Ma'arif", "Dimas Aji", "Dimas Kurniawan", "Fadel Muhammad Ramadhan",
  "Fadhil Qurunul Bahri", "Fadli (Dalwa)", "Fahmi Rojih", "Fahri Asmaul Jinan", "Fajar", "Falah",
  "Fanni Muhammad Janki Dausat", "Farid Muwafiqul Falah", "Fathoni", "Faza Al Fairuz", "Feri",
  "Haidar Al Ghozi", "Ilham Afied Prasetya", "Iqbal Doni Saputra", "Ismail Fajri Mahadri", "Izza",
  "Izzudin Hikam Al Rodli", "Khafidz Alfarizi", "Kholili Abdul H", "Lukman Amir Dalilul Khairat",
  "Maulana Risqi Manan", "Miftahul Huda Said", "Miftakhur Rizqi Aditya", "Mohammad Danil Murtadho",
  "Muhamad Hildan Fadhil A.", "Muhammad Abid Ghufron", "Muhammad Adam Jauhari", "Muhammad Ahsan Nazil",
  "Muhammad Alawy Maghfur", "Muhammad Amril Mufti", "Muhammad Arkan Althaf", "Muhammad Bahij Al Auzi Wahid",
  "Muhammad Dani Farkhan", "Muhammad Dika Miftahul Khoir", "Muhammad Fadlu", "Muhammad Fajar Rizal F.",
  "Muhammad Fikri Maulana", "Muhammad Fikri Nasrullah", "Muhammad Hilmi Muwaffaq", "Muhammad Ibrahim Al Kholili",
  "Muhammad Ivraka Adiputra", "Muhammad Lubab Ahris Al Alawi", "Muhammad Miqdad Baihaqi", "Muhammad Mughna",
  "Muhammad Najih Naufal", "Muhammad Rifki Nor Izdihar", "Muhammad Rizki Pratama", "Muhammad Rizqi Maulana",
  "Muhammad Rizqi Raditya", "Muhammad Shihab M. Faris", "Muhammad Syaiful Islam Arramadhan",
  "Muhammad Taufiqul Hadi", "Muhammad Wafi Syifa'ul F", "Muhammad Wi'am Firman Iltizam", "Muhammad Xafi Al Fattah",
  "Muhammad Zaenal Arifin", "Muhammad Zainur Rohman", "Muhammat Misbahul Huda", "Mushoffa Arba Yamin",
  "Muzakkyl Falah Mubarok", "Naufal Abdan Malik", "Nur Yanto", "Radit", "Rangga Hariyanto", "Rifal Aztsauri",
  "Rizky Ahmad Azka", "Robet Kafi Wakafa", "Sholahuddin", "Shoni", "Soffan Syarofi", "Susilo",
  "Susilo Budi Pranoto", "Syamsi Maulidi Aziz Abdillah", "Syarifuddin Sa'dulloh", "Syirwan Abdillah Akbar",
  "Tegar Ibrahim", "Udin", "Umar Azzahidi", "Umarul Mukminin", "Utsman Karim Musthofa", "Valdis Rayhan Rifaldo",
  "Vallent Firmansyah", "Wildan Ahmad Baihaqi", "Wiwik", "Yusuf Syaifuddin", "Zaini Fahrizal Amri", "Zainuri"
];

const MASTER_JENIS_FIX = [
  "Absen Malam (Menginap)", "Badriyyah (Jum’at)", "Imam/adzan Ashar", "Imam/adzan Dhuhur", "Imam/adzan Isya",
  "Imam/adzan Maghrib", "Imam/adzan Subuh", "Jama'ah Ashar", "Jama'ah Isya", "Jama'ah Maghrib",
  "Jama'ah Subuh", "Kegiatan Malam", "Khataman (Jum’at)", "Ngaji Malam", "Ngaji Sore", "Ngaji Subuh", "Tandzif"
];

// --- HELPERS & CONFIG ---
const SUPER_ADMINS = ["daruttauhidpotroyudan@gmail.com", "ma2n13@gmail.com"];
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

// --- SUB-COMPONENTS ---
// 1. History Grid (Kalender Matriks)
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

                return (
                  <div key={day} className={`${cellBase} ${cellClass} w-9 cursor-help`} title={title}>
                    {content}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// 2. SantriList Component
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

// 3. Batch/Admin Components (Updated for Approval & Assignment)
const BatchUsers = memo(({ users, pending, types, onDel, onApprove, onReject, onUpdateAssignment }) => {
    const [editMode, setEditMode] = useState(null); // ID of user being edited
    const [tempAssign, setTempAssign] = useState([]);
    const [tab, setTab] = useState("active"); // active, pending

    const handleEdit = (u) => {
        setEditMode(u.id);
        setTempAssign(u.assignedTypes || []);
    };
    
    const saveEdit = () => {
        onUpdateAssignment(editMode, tempAssign);
        setEditMode(null);
    }

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
                            
                            {/* Assignment Section */}
                            {u.role !== 'admin' && (
                                <div className="bg-[var(--bg-sub)] p-2 rounded border border-[var(--border)] text-xs">
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

const BatchDaily = memo(({ types, searchState, setSearch, onSearch, result, selected, setSelected, target, setTarget, onExec }) => (
  <div className="space-y-4 animate-fade-in">
    <div className="flex gap-2">
      <input type="date" className="input-field py-2.5 flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 text-sm" value={searchState.date} onChange={e => setSearch({...searchState, date: e.target.value})} />
      <button onClick={onSearch} className="bg-blue-600 text-white rounded px-4 text-sm font-bold shadow-sm hover:bg-blue-700">🔍 Cari</button>
    </div>
    <select className="input-field py-2.5 w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-3 text-sm" value={searchState.jenis} onChange={e => setSearch({...searchState, jenis: e.target.value})}>
      <option value="">-- Pilih Jenis Pelanggaran --</option>
      {types.map(j => <option key={j.id} value={j.nama}>{j.nama}</option>)}
    </select>
    {result.length > 0 && (
      <div className="bg-[var(--bg-card)] p-3 rounded border border-[var(--border)] mt-2 shadow-sm">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-[var(--border)]">
          <span className="text-sm font-bold">Ditemukan: {result.length}</span>
          <button onClick={() => setSelected(selected.length === result.length ? [] : result.map(r => r.id))} className="text-xs text-blue-500 font-bold underline p-1">All / None</button>
        </div>
        <div className="max-h-40 overflow-y-auto space-y-1.5 mb-4 custom-scrollbar">
          {result.map(r => (
            <label key={r.id} className="flex gap-3 p-2 hover:bg-[var(--bg-hover)] rounded border border-[var(--border)] cursor-pointer items-center bg-[var(--bg-input)]">
              <input type="checkbox" checked={selected.includes(r.id)} onChange={() => setSelected(p => p.includes(r.id) ? p.filter(x => x !== r.id) : [...p, r.id])} className="accent-blue-500 w-4 h-4" />
              <span className="text-sm font-medium truncate">{r.nama}</span>
            </label>
          ))}
        </div>
        <div className="bg-[var(--bg-sub)] p-3 rounded border border-[var(--border)] space-y-3">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase">Aksi Massal ({selected.length} Item)</p>
          <div className="grid grid-cols-1 gap-2">
            <select className="input-field w-full py-2.5 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded px-2" value={target.newJenis} onChange={e => setTarget({...target, newJenis: e.target.value})}>
              <option value="">-- Ganti Jenis Baru --</option>
              {types.map(j => <option key={j.id} value={j.nama}>{j.nama}</option>)}
            </select>
            <input type="date" className="input-field w-full py-2.5 text-sm bg-[var(--bg-input)] border border-[var(--border)] rounded px-2" value={target.newDate} onChange={e => setTarget({...target, newDate: e.target.value})} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => onExec('update_all')} className="flex-[2] bg-green-700 hover:bg-green-800 text-white py-2.5 rounded text-sm font-bold shadow-sm">UPDATE DATA</button>
            <button onClick={() => onExec('delete')} className="flex-1 bg-red-700 hover:bg-red-800 text-white py-2.5 rounded text-sm font-bold shadow-sm">HAPUS</button>
          </div>
        </div>
      </div>
    )}
  </div>
));

const BatchSantri = memo(({ santri, form, setForm, onAdd, onUpdate, onDel, edit, setEdit }) => (
  <div className="space-y-4 animate-fade-in">
    <div className="flex gap-2 items-center">
      <input type="text" placeholder="Nama Santri Baru..." className="input-field flex-1 min-w-0 px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded text-sm" value={form} onChange={e => setForm(e.target.value)} onKeyDown={e => e.key === 'Enter' && onAdd()} />
      <button onClick={onAdd} className="bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 rounded font-bold text-lg shadow-sm shrink-0 flex items-center justify-center">+</button>
    </div>
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg h-72 overflow-y-auto custom-scrollbar divide-y divide-[var(--border)]">
      {santri.map(s => (
        <div key={s.id} className="p-3 flex justify-between items-center hover:bg-[var(--bg-hover)]">
          {edit?.id === s.id ? (
            <div className="flex gap-2 w-full items-center">
              <input type="text" className="flex-1 min-w-0 bg-[var(--bg-input)] border border-blue-500 rounded px-2 py-1.5 text-sm" value={edit.nama} onChange={e => setEdit({...edit, nama: e.target.value})} autoFocus />
              <button onClick={onUpdate} className="text-green-600 p-1 font-bold text-lg">💾</button>
              <button onClick={() => setEdit(null)} className="text-red-500 p-1 font-bold text-lg">✖</button>
            </div>
          ) : (
            <>
              <span className="text-sm font-medium text-[var(--text-main)] truncate">{s.nama}</span>
              <div className="flex gap-3">
                <button onClick={() => setEdit({id: s.id, nama: s.nama})} className="text-[var(--text-muted)] hover:text-blue-500 text-sm">✏️</button>
                <button onClick={() => onDel(s.id)} className="text-[var(--text-muted)] hover:text-red-500 text-sm">🗑️</button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  </div>
));

const BatchDanger = memo(({ form, setForm, onExec, loading, onResetMaster }) => (
  <div className="space-y-6 mt-6">
    <div className="bg-red-950/5 border border-red-200 p-4 rounded-lg space-y-3 shadow-sm">
      <h2 className="text-sm font-bold text-red-700 flex items-center gap-2">⚠️ HAPUS MASSAL</h2>
      <p className="text-xs text-red-600/80">Hapus permanen semua data pelanggaran dalam rentang tanggal.</p>
      <div className="grid grid-cols-2 gap-3">
        {['start', 'end'].map(k => <input key={k} type="date" className="input-field w-full py-2 bg-white border border-red-300 rounded text-sm focus:border-red-500 text-red-900" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} />)}
      </div>
      <button onClick={onExec} disabled={loading} className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded text-sm shadow-md transition active:scale-[0.98]">HAPUS TOTAL</button>
    </div>

    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-300 p-4 rounded-lg space-y-2">
        <h2 className="text-sm font-bold text-orange-800 dark:text-orange-200">🛠️ RESET MASTER DATA</h2>
        <p className="text-xs text-orange-700/80 dark:text-orange-300/80">
            Hapus semua Santri & Jenis Pelanggaran lama, lalu ganti dengan versi baru (Hardcoded).
            <br/><span className="font-bold">Tekan ini sekali setelah update aplikasi!</span>
        </p>
        <button onClick={onResetMaster} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded text-sm shadow-md transition active:scale-[0.98]">
            UPDATE MASTER KE VERSI BARU
        </button>
    </div>
  </div>
));

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
                    <button onClick={() => signOut(auth)} className="w-full mt-2 text-red-500 font-bold text-sm hover:underline">Batal / Logout</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
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

  useEffect(() => { document.body.classList.toggle('dark-mode', ui.dark); }, [ui.dark]);
  
  useEffect(() => {
    const q = (c, o) => query(collection(db, c), orderBy(...o));
    const unsubs = [
      onSnapshot(q("master_santri", ["nama"]), s => setData(p => ({ ...p, santri: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
      onSnapshot(q("master_jenis", ["nama"]), s => setData(p => ({ ...p, jenis: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
      onSnapshot(q("logs_pelanggaran", ["tglMelanggar", "desc"]), s => setData(p => ({ ...p, logs: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
      onSnapshot(q("santri_catatan", ["createdAt", "desc"]), s => setData(p => ({ ...p, catatan: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
      onSnapshot(collection(db, "manage_users"), s => setData(p => ({ ...p, users: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
      onSnapshot(collection(db, "users_pending"), s => setData(p => ({ ...p, pendingUsers: s.docs.map(d => ({ id: d.id, ...d.data() })) })))
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      let role = null;
      let dbUser = null;
      let isPending = false;

      if (u) {
        if (SUPER_ADMINS.includes(u.email)) {
            role = "admin";
            dbUser = { email: u.email, role: 'admin', nickname: 'Super Admin' };
        } else {
            const found = data.users.find(user => user.email === u.email);
            if (found) {
                role = found.role;
                dbUser = found;
            } else {
                // Check if pending
                const pending = data.pendingUsers.find(pu => pu.email === u.email);
                if (pending) isPending = true;
            }
        }
      }
      setUi(p => ({ ...p, user: u, role, dbUser, isPending }));
    });
  }, [data.users, data.pendingUsers]);

  const showToast = useCallback((msg) => { setUi(p => ({...p, toast: msg})); setTimeout(() => setUi(p => ({...p, toast: null})), 3000); }, []);
  
  const exec = useCallback(async (fn, confirmMsg) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setUi(p => ({...p, loading: true}));
    try { await fn(); } catch (e) { alert(e.message); }
    setUi(p => ({...p, loading: false}));
  }, []);

  const crud = useMemo(() => ({
    save: (e) => { 
      e.preventDefault(); 
      if (!forms.input.jenis || !forms.input.students.length) return alert("Pilih data!");
      exec(async () => {
        const batch = writeBatch(db); 
        forms.input.students.forEach(nama => batch.set(doc(collection(db, "logs_pelanggaran")), { nama, jenis: forms.input.jenis, tglMelanggar: forms.input.date, statusTazir: forms.input.isTazir, keterangan: forms.input.keterangan, createdAt: serverTimestamp() })); 
        await batch.commit(); 
        setForms(p => ({ ...p, input: { ...p.input, students: [], keterangan: "" } })); 
        showToast("✅ Berhasil Simpan");
      });
    },
    delMany: (ids) => exec(async () => { const batch = writeBatch(db); ids.forEach(id => batch.delete(doc(db, "logs_pelanggaran", id))); await batch.commit(); showToast("Terhapus"); }, `Hapus ${ids.length} data?`),
    tazir: (nama, e) => { e.stopPropagation(); exec(async () => { const batch = writeBatch(db); (await getDocs(query(collection(db, "logs_pelanggaran"), where("nama", "==", nama), where("statusTazir", "==", "Belum")))).forEach(d => batch.update(d.ref, { statusTazir: "Sudah" })); await batch.commit(); showToast("Di-ta'zir"); }); },
    addNote: (nama) => { if(forms.note.trim()) exec(async () => { await addDoc(collection(db, "santri_catatan"), { nama, isi: forms.note, createdAt: serverTimestamp() }); setForms(p => ({...p, note: ""})); showToast("Catatan +"); }); },
    updateBatch: (action) => {
      if(!dailyRes.selected.length) return alert("Pilih data!");
      exec(async () => { const batch = writeBatch(db); dailyRes.selected.forEach(id => { const ref = doc(db, "logs_pelanggaran", id); action === 'delete' ? batch.delete(ref) : batch.update(ref, { jenis: forms.batchTarget.newJenis, tglMelanggar: forms.batchTarget.newDate }); }); await batch.commit(); showToast("Sukses"); setDailyRes({ list: [], selected: [] }); }, `${action} ${dailyRes.selected.length} data?`);
    },
    searchDaily: async () => { if(!forms.daily.jenis) return alert("Pilih jenis!"); const res = (await getDocs(query(collection(db, "logs_pelanggaran"), where("tglMelanggar", "==", forms.daily.date), where("jenis", "==", forms.daily.jenis)))).docs.map(d => ({id: d.id, ...d.data()})); setDailyRes({ list: res, selected: res.map(r => r.id) }); setForms(p => ({...p, batchTarget: { newJenis: forms.daily.jenis, newDate: forms.daily.date }})); if(!res.length) showToast("Nihil"); },
    backup: () => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([JSON.stringify({ collections: { master_santri: data.santri, master_jenis: data.jenis, logs_pelanggaran: data.logs, santri_catatan: data.catatan }}, null, 2)], {type: "application/json"})); link.download = `backup_${getDate()}.json`; link.click(); },
    processRestore: () => { const file = forms.restoreFile; if (!file) return; exec(async () => { const json = JSON.parse(await file.text()); for (const [col, docs] of Object.entries(json.collections)) { for (let i=0; i<docs.length; i+=450) { const batch = writeBatch(db); docs.slice(i, i+450).forEach(({id, ...r}) => id && batch.set(doc(db, col, id), r)); await batch.commit(); } } showToast(`Restored`); setForms(p => ({...p, restoreFile: null})); }, "Tutup data lama?"); },
    importCsv: () => exec(async () => { const batch = writeBatch(db); forms.csv.trim().split("\n").slice(1).forEach(r => { const c = r.split(","); if(c.length>=3) { const [m,d,y] = c[2].trim().split("/"); batch.set(doc(collection(db, "logs_pelanggaran")), { nama: c[0].trim(), jenis: c[1].trim(), tglMelanggar: `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`, statusTazir: "Belum", createdAt: serverTimestamp() }); }}); await batch.commit(); showToast("Imported"); }),
    bulkDeleteRange: () => exec(async () => { const { start, end } = forms.bulkDel; const snap = await getDocs(query(collection(db, "logs_pelanggaran"), where("tglMelanggar", ">=", start), where("tglMelanggar", "<=", end))); if (snap.empty) return; const batch = writeBatch(db); snap.docs.forEach(d => batch.delete(d.ref)); await batch.commit(); showToast(`${snap.size} Terhapus`); }, `Hapus ${forms.bulkDel.start} - ${forms.bulkDel.end}?`),
    migrateRange: () => { const { start, end, oldJenis, newJenis } = forms.range; if(!oldJenis || !newJenis) return; exec(async () => { const snap = await getDocs(query(collection(db, "logs_pelanggaran"), where("tglMelanggar", ">=", start), where("tglMelanggar", "<=", end), where("jenis", "==", oldJenis))); if(snap.empty) return; const batch = writeBatch(db); snap.docs.forEach(d => batch.update(d.ref, { jenis: newJenis })); await batch.commit(); showToast(`${snap.size} Sukses`); }, "Ganti semua?"); },
    addSantri: () => { if (forms.santri.trim()) exec(async () => { await addDoc(collection(db, "master_santri"), { nama: forms.santri }); setForms(p => ({ ...p, santri: "" })); showToast("Santri +"); }); },
    updateSantri: () => { if (forms.editSantri?.nama.trim()) exec(async () => { await updateDoc(doc(db, "master_santri", forms.editSantri.id), { nama: forms.editSantri.nama }); setForms(p => ({ ...p, editSantri: null })); showToast("Updated"); }); },
    deleteSantri: (id) => exec(async () => { await deleteDoc(doc(db, "master_santri", id)); showToast("Deleted"); }, "Hapus?"),
    delUser: (id) => exec(async () => { await deleteDoc(doc(db, "manage_users", id)); showToast("Member -"); }, "Hapus?"),
    
    // NEW METHODS
    submitReg: (formData) => exec(async () => {
        await addDoc(collection(db, "users_pending"), {
            email: ui.user.email,
            uid: ui.user.uid,
            nickname: formData.nickname,
            assignedTypes: formData.assignedTypes,
            createdAt: serverTimestamp()
        });
        showToast("Menunggu Persetujuan Admin");
    }),
    approveUser: (userData) => exec(async () => {
        // Add to manage_users
        await addDoc(collection(db, "manage_users"), {
            email: userData.email,
            role: "pengurus",
            nickname: userData.nickname,
            assignedTypes: userData.assignedTypes || []
        });
        // Remove from pending
        await deleteDoc(doc(db, "users_pending", userData.id));
        showToast("User Disetujui");
    }),
    rejectUser: (id) => exec(async () => {
        await deleteDoc(doc(db, "users_pending", id));
        showToast("User Ditolak");
    }, "Tolak permintaan ini?"),
    updateUserAssignment: (userId, newTypes) => exec(async () => {
        await updateDoc(doc(db, "manage_users", userId), { assignedTypes: newTypes });
        showToast("Tugas Diupdate");
    }),
    resetMasterData: () => exec(async () => {
        // Batch limit 500, we do chunks
        const batchDelete = async (colName) => {
            const snap = await getDocs(collection(db, colName));
            const chunks = [];
            let currentChunk = writeBatch(db);
            let count = 0;
            snap.docs.forEach(d => {
                currentChunk.delete(d.ref);
                count++;
                if (count % 400 === 0) {
                    chunks.push(currentChunk);
                    currentChunk = writeBatch(db);
                }
            });
            chunks.push(currentChunk);
            for (const chunk of chunks) await chunk.commit();
        };

        const batchAdd = async (colName, list) => {
            const chunks = [];
            let currentChunk = writeBatch(db);
            let count = 0;
            list.forEach(name => {
                const ref = doc(collection(db, colName));
                currentChunk.set(ref, { nama: name });
                count++;
                if (count % 400 === 0) {
                    chunks.push(currentChunk);
                    currentChunk = writeBatch(db);
                }
            });
            chunks.push(currentChunk);
            for (const chunk of chunks) await chunk.commit();
        };

        await batchDelete("master_santri");
        await batchDelete("master_jenis");
        await batchAdd("master_santri", MASTER_SANTRI_FIX);
        await batchAdd("master_jenis", MASTER_JENIS_FIX);
        showToast("Master Data Reset!");
    }, "PERINGATAN: Ini akan menghapus semua santri dan jenis lama, lalu menggantinya dengan daftar baru. Lanjutkan?")
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
    return data.jenis; // Fallback if no specific assignment, show all or none? Let's show all for now unless restricted.
  }, [data.jenis, isAdmin, isPetugas, ui.dbUser]);

  // LOGIN FLOW HANDLING
  if (ui.user && !ui.dbUser) {
      if (ui.isPending) {
          return (
              <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-main)] text-[var(--text-main)] gap-4 animate-fade-in text-center p-6">
                  <div className="text-4xl">⏳</div>
                  <h1 className="text-xl font-bold">Menunggu Persetujuan Admin</h1>
                  <p className="text-sm opacity-70">Permintaan akses Anda sedang ditinjau.<br/>Notifikasi akan muncul di dashboard admin.</p>
                  <button onClick={() => signOut(auth)} className="text-red-500 font-bold underline text-sm">Logout</button>
              </div>
          );
      }
      return <RegForm user={ui.user} types={data.jenis} onSubmit={crud.submitReg} />;
  }

  return (
    <div className="h-[100dvh] bg-[var(--bg-main)] text-[var(--text-main)] font-sans flex flex-col overflow-hidden" onClick={() => setUi(p => ({...p, menu: false}))}>
      <div className="flex-none bg-[var(--bg-header)] px-4 py-3 border-b border-[var(--border)] z-50 shadow-md flex justify-between items-center h-[64px]">
        <h1 className="text-xl font-bold text-[var(--text-accent)] tracking-tight">Takziran App</h1>
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
                  <button onClick={() => { ui.user ? signOut(auth) : signInWithPopup(auth, googleProvider); setUi(p => ({...p, menu: false})); }} className={`w-full text-left px-5 py-3 text-sm font-bold flex items-center gap-2 ${ui.user ? "text-red-500" : "text-green-600"}`}>
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
                      {inputTypes.map(j => <option key={j.id} value={j.nama}>{j.nama}</option>)}
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
                      del: id => deleteDoc(doc(db, "logs_pelanggaran", id)), 
                      delMany: crud.delMany, 
                      addNote: crud.addNote, 
                      delNote: id => deleteDoc(doc(db, "santri_catatan", id)) 
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
                  <div className="bg-[var(--bg-card)] border border-cyan-700/30 rounded-xl overflow-hidden shadow-sm">
                     <div className="flex text-xs font-bold border-b border-cyan-700/20 bg-cyan-50/50">
                       <button onClick={() => setUi(p => ({...p, backupMode: "download"}))} className={`flex-1 py-3 ${ui.backupMode==="download"?"text-cyan-700 bg-cyan-100/50":"text-[var(--text-muted)]"}`}>Backup</button>
                       <button onClick={() => setUi(p => ({...p, backupMode: "restore"}))} className={`flex-1 py-3 ${ui.backupMode==="restore"?"text-cyan-700 bg-cyan-100/50":"text-[var(--text-muted)]"}`}>Restore</button>
                     </div>
                     <div className="p-4 bg-[var(--bg-card)] text-center">
                       {ui.backupMode === "download" ? (
                         <button onClick={crud.backup} className="w-full bg-cyan-700 text-white font-bold py-3 rounded-lg text-sm">DOWNLOAD JSON</button> 
                       ) : (
                         <div className="space-y-3">
                           <input type="file" accept=".json" onChange={e => setForms(p => ({...p, restoreFile: e.target.files[0]}))} className="block w-full text-xs" />
                           <button onClick={crud.processRestore} disabled={!forms.restoreFile} className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg text-sm">RESTORE DATA</button>
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