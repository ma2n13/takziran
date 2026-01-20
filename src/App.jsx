import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { supabase } from "./supabaseClient"; 
import GrafikPage from "./GrafikPage";

// --- DATA MASTER HARDCODED ---
const MASTER_SANTRI_FIX = ["Abidurrohman", "Achmad Romatullah Asy Syahir", "Afif Ali Mansyur", "Ahmad", "Ahmad Aniq Munir", "Ahmad Faris A'lauddin", "Ahmad Firiham", "Ahmad Hanaan Badar", "Ahmad Ilham Rizki", "Ahmad Malik Ibrahim", "Ahmad Muhammad Akaais T", "Ahmad Rifandi Julianto", "Ahmad Sheva Alfarisi", "Ahmad Syafiqul Anwar", "Ahmad Syahrul Khamdi", "Alfan Ni'am", "Alfan Okta Prasetia", "Ali", "Andan Juandistira", "Anugrah Nur Lillahi Akbar", "Arsyad (Dalwa)", "Asyraf Faeyza Alsyafaraz", "Aufal", "Azka Naja", "Bagus Adi Prayoga", "Bilal Nazhifa Dzakiy", "Catur Seno Prayogo", "Danil", "Davin Defriza", "Deni Oktafiano Putra", "Dian Ma'arif", "Dimas Aji", "Dimas Kurniawan", "Fadel Muhammad Ramadhan", "Fadhil Qurunul Bahri", "Fadli (Dalwa)", "Fahmi Rojih", "Fahri Asmaul Jinan", "Fajar", "Falah", "Fanni Muhammad Janki Dausat", "Farid Muwafiqul Falah", "Fathoni", "Faza Al Fairuz", "Feri", "Haidar Al Ghozi", "Ilham Afied Prasetya", "Iqbal Doni Saputra", "Ismail Fajri Mahadri", "Izza", "Izzudin Hikam Al Rodli", "Khafidz Alfarizi", "Kholili Abdul H", "Lukman Amir Dalilul Khairat", "Maulana Risqi Manan", "Miftahul Huda Said", "Miftakhur Rizqi Aditya", "Mohammad Danil Murtadho", "Muhamad Hildan Fadhil A.", "Muhammad Abid Ghufron", "Muhammad Adam Jauhari", "Muhammad Ahsan Nazil", "Muhammad Alawy Maghfur", "Muhammad Amril Mufti", "Muhammad Arkan Althaf", "Muhammad Bahij Al Auzi Wahid", "Muhammad Dani Farkhan", "Muhammad Dika Miftahul Khoir", "Muhammad Fadlu", "Muhammad Fajar Rizal F.", "Muhammad Fikri Maulana", "Muhammad Fikri Nasrullah", "Muhammad Hilmi Muwaffaq", "Muhammad Ibrahim Al Kholili", "Muhammad Ivraka Adiputra", "Muhammad Lubab Ahris Al Alawi", "Muhammad Miqdad Baihaqi", "Muhammad Mughna", "Muhammad Najih Naufal", "Muhammad Rifki Nor Izdihar", "Muhammad Rizki Pratama", "Muhammad Rizqi Maulana", "Muhammad Rizqi Raditya", "Muhammad Shihab M. Faris", "Muhammad Syaiful Islam Arramadhan", "Muhammad Taufiqul Hadi", "Muhammad Wafi Syifa'ul F", "Muhammad Wi'am Firman Iltizam", "Muhammad Xafi Al Fattah", "Muhammad Zaenal Arifin", "Muhammad Zainur Rohman", "Muhammat Misbahul Huda", "Mushoffa Arba Yamin", "Muzakkyl Falah Mubarok", "Naufal Abdan Malik", "Nur Yanto", "Radit", "Rangga Hariyanto", "Rifal Aztsauri", "Rizky Ahmad Azka", "Robet Kafi Wakafa", "Sholahuddin", "Shoni", "Soffan Syarofi", "Susilo", "Susilo Budi Pranoto", "Syamsi Maulidi Aziz Abdillah", "Syarifuddin Sa'dulloh", "Syirwan Abdillah Akbar", "Tegar Ibrahim", "Udin", "Umar Azzahidi", "Umarul Mukminin", "Utsman Karim Musthofa", "Valdis Rayhan Rifaldo", "Vallent Firmansyah", "Wildan Ahmad Baihaqi", "Wiwik", "Yusuf Syaifuddin", "Zaini Fahrizal Amri", "Zainuri"]; 
const MASTER_JENIS_FIX = ["Absen Malam (Menginap)", "Badriyyah (Jum’at)", "Imam/adzan Ashar", "Imam/adzan Dhuhur", "Imam/adzan Isya", "Imam/adzan Maghrib", "Imam/adzan Subuh", "Jama'ah Ashar", "Jama'ah Isya", "Jama'ah Maghrib", "Jama'ah Subuh", "Kegiatan Malam", "Khataman (Jum’at)", "Ngaji Malam", "Ngaji Sore", "Ngaji Subuh", "Tandzif"];

const SUPER_ADMINS = ["daruttauhidpotroyudan@gmail.com", "ma2n13@gmail.com"]; 
const ROLES = { ADMIN: 'admin', PENTAKZIR: 'pentakzir', PETUGAS: 'petugas_absen' };

const getDate = (d = new Date()) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
const fmtDate = (d) => new Date(d).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "short", day: "numeric" });

const Icon = memo(({ name, className, ...props }) => {
  const paths = {
    Chevron: "M19 9l-7 7-7-7",
    Menu: "M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z",
    Sun: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
    Moon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
  };
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={paths[name]} />
    </svg>
  );
});

// --- SUB-COMPONENTS ---
const HistoryGrid = memo(({ logs, types }) => {
  const [currDate, setCurrDate] = useState(new Date());
  const changeMonth = (delta) => setCurrDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + delta); return d; });
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
    <div className="bg-[var(--bg-card)] rounded-lg overflow-hidden border border-[var(--border)] select-none">
      <div className="flex justify-between items-center bg-[var(--bg-sub)] p-2 border-b border-[var(--border)]">
        <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition"><Icon name="Chevron" className="w-5 h-5 rotate-90" /></button>
        <span className="font-bold text-sm text-[var(--text-accent)] uppercase tracking-wide">{monthName}</span>
        <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition"><Icon name="Chevron" className="w-5 h-5 -rotate-90" /></button>
      </div>
      <div className="overflow-x-auto custom-scrollbar pb-2">
        <div className="inline-block min-w-full align-middle">
          <div className="flex border-b border-[var(--border)]">
            <div className="sticky left-0 z-20 w-44 min-w-[11rem] bg-[var(--bg-header)] border-r border-[var(--border)] shrink-0 p-2 text-xs font-bold text-[var(--text-muted)] flex items-center">Jenis</div>
            {daysArray.map(d => (<div key={d} className={`${cellBase} bg-[var(--bg-header)] text-[var(--text-muted)] w-9`}>{d}</div>))}
          </div>
          {types.map((jenis, idx) => (
            <div key={jenis.id || idx} className="flex border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-hover)]">
              <div className="sticky left-0 z-10 w-44 min-w-[11rem] bg-[var(--bg-card)] border-r border-[var(--border)] shrink-0 px-3 py-1 text-[11px] font-medium leading-tight flex items-center text-[var(--text-main)] shadow-sm">{jenis.nama}</div>
              {daysArray.map(day => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const violation = currentMonthLogs.find(l => l.jenis === jenis.nama && l.tglMelanggar === dateStr);
                let cellClass = "bg-emerald-600/5"; let content = "";
                if (violation) {
                   const isSudah = violation.statusTazir === "Sudah";
                   cellClass = isSudah ? "bg-amber-500 text-white" : "bg-red-600 text-white shadow-inner";
                   content = isSudah ? "S" : "B";
                }
                return <div key={day} className={`${cellBase} ${cellClass} w-9`}>{content}</div>;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

const SantriList = memo(({ filterTazir, groupedLogs, groupedNotes, expanded, setExpanded, role, actions, noteForm, setNoteForm, types, users }) => {
  const canDelete = [ROLES.ADMIN, ROLES.PENTAKZIR].includes(role);
  const canTazir = [ROLES.ADMIN, ROLES.PENTAKZIR].includes(role);

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
        const count = groupedLogs[nama].filter(l => l.statusTazir === "Belum").length;
        
        return (
          <div key={nama} className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="bg-[var(--bg-header)] p-4 flex justify-between items-center cursor-pointer hover:bg-[var(--bg-hover)]" onClick={() => setExpanded(p => ({...p, [nama]: !p[nama]}))}>
              <div className="flex-1">
                <div className="font-bold text-base text-[var(--text-accent)]">{nama}</div>
                {canDelete && sel.length > 0 && <div onClick={(e) => { e.stopPropagation(); actions.delMany(sel); setSelectedIds([]); }} className="mt-1 text-red-600 text-[10px] font-bold uppercase">🗑️ Hapus {sel.length} item</div>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`${count > 0 ? "bg-red-600" : "bg-green-600"} text-[10px] w-6 h-6 flex items-center justify-center rounded-full text-white font-bold`}>{count}</span>
                {filterTazir && canTazir && count > 0 && <button onClick={(e) => actions.tazir(nama, e)} className="text-[10px] bg-orange-600 text-white px-2 py-1 rounded font-bold">Takzir</button>}
                <Icon name="Chevron" className={`w-5 h-5 transition-transform ${expanded[nama] ? 'rotate-180' : ''}`} />
              </div>
            </div>
            {expanded[nama] && (
              <div className="bg-[var(--bg-sub)] border-t border-[var(--border)] p-2 space-y-2">
                {!filterTazir ? (
                    <>
                        <HistoryGrid logs={groupedLogs[nama]} types={types} />
                        <div className="bg-[var(--bg-note)] rounded border border-[var(--border)]">
                            <div className="p-2 text-[10px] font-bold text-amber-600 uppercase border-b border-[var(--border)]">Catatan Pengasuh</div>
                            {notes.map(n => <div key={n.id} className="flex justify-between text-xs p-2 border-b border-[var(--border)] last:border-0"><span>{n.isi}</span>{canDelete && <button onClick={() => actions.delNote(n.id)} className="text-red-500 font-bold">×</button>}</div>)}
                            <div className="p-2 flex gap-2">
                                <input type="text" className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs" value={noteForm} onChange={e => setNoteForm(e.target.value)} placeholder="..." />
                                <button onClick={() => actions.addNote(nama)} className="bg-amber-700 text-white px-3 py-1 rounded text-[10px] font-bold">Add</button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="divide-y divide-[var(--border)]">
                        {items.map(l => (
                          <div key={l.id} className="p-2 flex justify-between items-start">
  <div className="flex gap-2">
      {canDelete && <input type="checkbox" checked={selectedIds.includes(l.id)} onChange={() => toggleSel(l.id)} className="mt-1 accent-red-600" />}
      <div>
          <div className="font-bold text-xs">
    {l.jenis} 
    {/* Menampilkan nama petugas dengan gaya yang lebih bersih */}
    <span className="ml-1 text-[9px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800">
        | {users?.find(u => u.assignedTypes?.includes(l.jenis))?.nickname || "Umum"}
    </span>
</div>
          <div className="text-[10px] text-[var(--text-muted)]">{fmtDate(l.tglMelanggar)}</div>
      </div>
  </div>
  <button onClick={() => actions.del(l.id)} className="text-[10px] text-red-600">Hapus</button>
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
    const [editMode, setEditMode] = useState(null);
    const [tempAssign, setTempAssign] = useState([]);
    const [tempRole, setTempRole] = useState("");
    const [pendingRoles, setPendingRoles] = useState({});
    const [showManual, setShowManual] = useState(false);
    const [manualForm, setManualForm] = useState({ email: "", nickname: "", role: ROLES.PETUGAS });

    return (
        <div className="space-y-4">
            {/* TAMBAH MANUAL TOGGLE */}
            <button onClick={() => setShowManual(!showManual)} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase shadow-sm">
                {showManual ? "Batal Tambah" : "+ Tambah Member Manual"}
            </button>

            {showManual && (
                <div className="bg-[var(--bg-card)] border-2 border-blue-500/30 p-3 rounded-lg space-y-3">
                    <input type="email" placeholder="Email Google Member" className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={manualForm.email} onChange={e => setManualForm({...manualForm, email: e.target.value})} />
                    <input type="text" placeholder="Nama Panggilan" className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={manualForm.nickname} onChange={e => setManualForm({...manualForm, nickname: e.target.value})} />
                    <select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs font-bold" value={manualForm.role} onChange={e => setManualForm({...manualForm, role: e.target.value})}>
                        <option value={ROLES.PETUGAS}>Level: Petugas Absen</option>
                        <option value={ROLES.PENTAKZIR}>Level: Pentakzir</option>
                        <option value={ROLES.ADMIN}>Level: Admin</option>
                    </select>
                    <button onClick={() => { onAddManual(manualForm); setShowManual(false); setManualForm({email:"", nickname:"", role:ROLES.PETUGAS}); }} className="w-full bg-green-600 text-white py-2 rounded font-bold text-xs uppercase">Simpan Member</button>
                </div>
            )}

            {/* DAFTAR MEMBER AKTIF */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] overflow-hidden">
                <div className="p-2 bg-[var(--bg-sub)] text-[10px] font-bold uppercase">Member Aktif</div>
                {users.map(u => (
    <div key={u.id} className="p-3">
        <div className="flex justify-between items-center mb-1">
            <div className="text-xs font-bold">{u.nickname} <span className="text-[9px] font-normal opacity-60">({u.email})</span></div>
            <div className="flex gap-1">
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${u.role === 'admin' ? 'bg-red-100 text-red-600' : u.role === 'pentakzir' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {u.role}
                </span>
                <button onClick={() => onDel(u.id)} className="text-red-600 text-[10px] ml-2">Hapus</button>
            </div>
        </div>

        {/* BAGIAN BARU: Menampilkan Tugas/Pelanggaran yang ditangani */}
        <div className="mt-1">
            {u.role === 'pentakzir' ? (
                <div className="text-[9px] text-purple-600 font-medium italic">Hak Akses: Sidang & Eksekusi Takzir</div>
            ) : (
                <div className="flex flex-wrap gap-1">
                    <span className="text-[9px] text-gray-500 mr-1">Tugas:</span>
                    {u.assignedTypes && u.assignedTypes.length > 0 ? (
                        u.assignedTypes.map((t, idx) => (
                            <span key={idx} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[9px] px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                                {t}
                            </span>
                        ))
                    ) : (
                        <span className="text-[9px] text-red-400 italic">Belum ada tugas</span>
                    )}
                </div>
            )}
        </div>
    </div>
))}
            </div>

            {/* PERMINTAAN AKSES (PENDING) */}
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
                        {/* Menampilkan label role yang diajukan user saat mendaftar */}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${p.role === 'pentakzir' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {p.role === 'pentakzir' ? 'Minta: Pentakzir' : 'Minta: Petugas'}
                        </span>
                    </div>

                    {/* Menampilkan daftar tugas jika dia mendaftar sebagai petugas */}
                    {p.role !== 'pentakzir' && (
                        <div className="text-[10px] bg-white/50 dark:bg-black/20 p-2 rounded border border-amber-200 mb-2">
                            <div className="font-bold text-amber-800 dark:text-amber-500 mb-0.5">Tugas yang dipilih:</div>
                            <div className="italic text-gray-600 dark:text-gray-400">
                                {p.assignedTypes?.length > 0 ? p.assignedTypes.join(", ") : "Tidak memilih tugas"}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 items-center">
                        {/* Dropdown untuk Admin menentukan role final */}
                        <select 
                            className="flex-1 text-[10px] border border-amber-300 rounded p-1 bg-white" 
                            value={pendingRoles?.[p.id] || p.role || "petugas_absen"} 
                            onChange={(e) => setPendingRoles({...pendingRoles, [p.id]: e.target.value})}
                        >
                            <option value="petugas_absen">Setujui sbg: Petugas</option>
                            <option value="pentakzir">Setujui sbg: Pentakzir</option>
                            <option value="admin">Setujui sbg: Admin</option>
                        </select>
                        
                        <button 
                            onClick={() => onApprove(p, pendingRoles?.[p.id] || p.role || "petugas_absen")} 
                            className="bg-green-600 text-white px-3 py-1 rounded text-[10px] font-bold"
                        >
                            Terima
                        </button>
                        
                        <button 
                            onClick={() => onReject(p.id)} 
                            className="bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold"
                        >
                            Tolak
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
)}
        </div>
    );
});

const BatchSantri = memo(({ santri, form, setForm, edit, setEdit, onAdd, onUpdate, onDel }) => (
    <div className="space-y-4">
        <div className="flex gap-2">
            <input type="text" className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs" placeholder="Nama Santri..." value={edit ? edit.nama : form} onChange={e => edit ? setEdit({...edit, nama: e.target.value}) : setForm(e.target.value)} />
            <button onClick={edit ? onUpdate : onAdd} className="bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-bold">{edit ? "Simpan" : "Tambah"}</button>
        </div>
        <div className="max-h-60 overflow-y-auto border border-[var(--border)] rounded divide-y divide-[var(--border)]">
            {santri.map(s => <div key={s.id} className="p-2 flex justify-between items-center text-xs"><span>{s.nama}</span><div className="flex gap-2"><button onClick={() => setEdit(s)} className="text-blue-500">Edit</button><button onClick={() => onDel(s.id)} className="text-red-500">Hapus</button></div></div>)}
        </div>
    </div>
));

const BatchDaily = memo(({ types, searchState, setSearch, onSearch, result, selected, setSelected, target, setTarget, onExec }) => (
    <div className="space-y-4">
        <div className="flex gap-2">
           <input type="date" className="bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs" value={searchState.date} onChange={e => setSearch({...searchState, date: e.target.value})} />
           <select className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs" value={searchState.jenis} onChange={e => setSearch({...searchState, jenis: e.target.value})}><option value="">Pilih Pelanggaran...</option>{types.map(t => <option key={t.id} value={t.nama}>{t.nama}</option>)}</select>
           <button onClick={onSearch} className="bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-bold">Cari</button>
        </div>
        {result.length > 0 && (
            <div className="space-y-2">
                <div className="max-h-40 overflow-y-auto border border-[var(--border)] rounded p-2 bg-[var(--bg-sub)]">
                    {result.map(r => <label key={r.id} className="flex items-center gap-2 text-xs py-1"><input type="checkbox" checked={selected.includes(r.id)} onChange={() => setSelected(p => p.includes(r.id) ? p.filter(x=>x!==r.id) : [...p, r.id])} />{r.nama}</label>)}
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/10 p-2 rounded border border-amber-200 grid grid-cols-2 gap-2">
                    <input type="date" className="bg-white border rounded px-2 py-1 text-xs text-black" value={target.newDate} onChange={e => setTarget({...target, newDate: e.target.value})} />
                    <select className="bg-white border rounded px-2 py-1 text-xs text-black" value={target.newJenis} onChange={e => setTarget({...target, newJenis: e.target.value})}>{types.map(t => <option key={t.id} value={t.nama}>{t.nama}</option>)}</select>
                    <button onClick={() => onExec('update')} className="bg-green-600 text-white py-1 rounded text-[10px] font-bold uppercase">Update</button>
                    <button onClick={() => onExec('delete')} className="bg-red-600 text-white py-1 rounded text-[10px] font-bold uppercase">Hapus</button>
                </div>
            </div>
        )}
    </div>
));

const BatchDanger = memo(({ form, setForm, onExec, loading, onResetMaster }) => (
    <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 p-3 rounded-lg">
            <h3 className="text-red-600 font-bold uppercase text-[10px] mb-2">Hapus Data Berdasarkan Range Tanggal</h3>
            <div className="flex gap-2 mb-2">
                <input type="date" className="flex-1 bg-white border border-red-200 rounded px-2 py-1 text-xs text-black" value={form.start} onChange={e => setForm({...form, start: e.target.value})} />
                <input type="date" className="flex-1 bg-white border border-red-200 rounded px-2 py-1 text-xs text-black" value={form.end} onChange={e => setForm({...form, end: e.target.value})} />
            </div>
            <button onClick={onExec} className="w-full bg-red-600 text-white py-2 rounded font-bold text-xs">{loading ? "MENGHAPUS..." : "HAPUS PERMANEN"}</button>
        </div>
        <div className="p-3 border-t border-[var(--border)]">
            <h3 className="text-red-600 font-bold uppercase text-[10px] mb-2">Atur Ulang Master Data</h3>
            <button onClick={onResetMaster} className="w-full border-2 border-red-600 text-red-600 py-2 rounded font-bold text-xs uppercase">Reset Master Data (Factory Reset)</button>
        </div>
    </div>
));

export default function App() {
  const [ui, setUi] = useState({ user: null, role: null, dbUser: null, isPending: false, tab: "takziran", menu: false, loading: false, toast: null, dark: localStorage.getItem("theme") !== "light", batchMode: "users" });
  const [data, setData] = useState({ santri: [], jenis: [], logs: [], catatan: [], users: [], pendingUsers: [] });
  const [forms, setForms] = useState({ 
    input: { jenis: "", date: getDate(), students: [], isTazir: "Belum", keterangan: "" }, note: "", santri: "", editSantri: null,
    bulkDel: { start: getDate(), end: getDate() }, daily: { date: getDate(), jenis: "" }, batchTarget: { newJenis: "", newDate: "" },
    range: { start: getDate(new Date(Date.now() - 7*864e5)), end: getDate(), oldJenis: "", newJenis: "" }, restoreFile: null,
    filter: { start: getDate(new Date(Date.now() - 30*864e5)), end: getDate() },
    regNickname: "", regRole: ROLES.PETUGAS, regAssignment: []
  });
  const [expanded, setExpanded] = useState({});
  const [dailyRes, setDailyRes] = useState({ list: [], selected: [] });

  const fetchData = useCallback(async () => {
    setUi(p => ({...p, loading: true}));
    try {
      const [s, j, u, p, l, c] = await Promise.all([
        supabase.from('master_santri').select('*').order('nama'),
        supabase.from('master_jenis').select('*').order('nama'),
        supabase.from('manage_users').select('*').order('email'),
        supabase.from('users_pending').select('*').order('createdAt'),
        supabase.from('logs_pelanggaran').select('*').order('tglMelanggar', {ascending: false}),
        supabase.from('santri_catatan').select('*').order('createdAt', {ascending: false})
      ]);
      setData({ santri: s.data || [], jenis: j.data || [], users: u.data || [], pendingUsers: p.data || [], logs: l.data || [], catatan: c.data || [] });
    } catch (err) { console.error("Fetch Error:", err); } 
    finally { setUi(p => ({...p, loading: false})); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { document.body.classList.toggle('dark-mode', ui.dark); }, [ui.dark]);
  
  useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
    const u = session?.user;
    if (!u) {
      setUi(p => ({ ...p, user: null, role: null, dbUser: null, isPending: false }));
      return;
    }

    if (SUPER_ADMINS.includes(u.email)) {
      setUi(p => ({ ...p, user: u, role: 'admin', dbUser: { email: u.email, role: 'admin' }, isPending: false }));
      return;
    }

    try {
      // Cek di manage_users
      const { data: found, error: err1 } = await supabase.from('manage_users').select('*').eq('email', u.email).maybeSingle();
      
      if (found) {
        setUi(p => ({ ...p, user: u, role: found.role, dbUser: found, isPending: false }));
      } else {
        // Jika tidak ada di manage_users, baru cek di pending
        const { data: pend, error: err2 } = await supabase.from('users_pending').select('*').eq('email', u.email).maybeSingle();
        setUi(p => ({ ...p, user: u, isPending: !!pend, dbUser: null }));
      }
    } catch (err) {
      console.error("Auth check error:", err);
    }
  });
  return () => subscription.unsubscribe();
}, []);

  const showToast = useCallback((msg) => { setUi(p => ({...p, toast: msg})); setTimeout(() => setUi(p => ({...p, toast: null})), 3000); }, []);
  const exec = useCallback(async (fn, confirmMsg) => { if (confirmMsg && !confirm(confirmMsg)) return; setUi(p => ({...p, loading: true})); try { await fn(); } catch (e) { alert(e.message); } setUi(p => ({...p, loading: false})); }, []);

  const crud = useMemo(() => ({
    save: (e) => { e.preventDefault(); if (!forms.input.jenis || !forms.input.students.length) return alert("Pilih data!"); exec(async () => {
        const payload = forms.input.students.map(nama => ({ nama, jenis: forms.input.jenis, tglMelanggar: forms.input.date, statusTazir: forms.input.isTazir, keterangan: forms.input.keterangan }));
        await supabase.from('logs_pelanggaran').insert(payload); fetchData(); setForms(p => ({...p, input: {...p.input, students: [], keterangan: ""}})); showToast("Berhasil Disimpan");
    }); },
    delMany: (ids) => exec(async () => { await supabase.from('logs_pelanggaran').delete().in('id', ids); fetchData(); showToast("Terhapus"); }, `Hapus ${ids.length} item?`),
    tazir: (nama, e) => { e.stopPropagation(); exec(async () => { await supabase.from('logs_pelanggaran').update({statusTazir: "Sudah"}).eq('nama', nama).eq('statusTazir', 'Belum'); fetchData(); showToast("Status Diperbarui"); }); },
    addNote: (nama) => { if(forms.note.trim()) exec(async () => { await supabase.from('santri_catatan').insert([{nama, isi: forms.note}]); fetchData(); setForms(p => ({...p, note: ""})); showToast("Catatan Ditambahkan"); }); },
    delNote: (id) => exec(async () => { await supabase.from('santri_catatan').delete().eq('id', id); fetchData(); showToast("Catatan Dihapus"); }),
    searchDaily: async () => { if(!forms.daily.jenis) return; const {data} = await supabase.from('logs_pelanggaran').select('*').eq("tglMelanggar", forms.daily.date).eq("jenis", forms.daily.jenis); setDailyRes({list: data||[], selected:(data||[]).map(r=>r.id)}); setForms(p => ({...p, batchTarget: {newJenis: forms.daily.jenis, newDate: forms.daily.date}})); },
    updateBatch: (action) => exec(async () => { 
        if(action === 'delete') await supabase.from('logs_pelanggaran').delete().in('id', dailyRes.selected);
        else await supabase.from('logs_pelanggaran').update({jenis: forms.batchTarget.newJenis, tglMelanggar: forms.batchTarget.newDate}).in('id', dailyRes.selected);
        fetchData(); showToast("Batch Sukses"); setDailyRes({list:[], selected:[]});
    }, `${action} ${dailyRes.selected.length} data?`),
    backup: () => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([JSON.stringify({collections:{master_santri:data.santri, master_jenis:data.jenis, logs_pelanggaran:data.logs, santri_catatan:data.catatan}}, null, 2)], {type: "application/json"})); link.download = `backup_${getDate()}.json`; link.click(); },
    processRestore: () => exec(async () => {
        const json = JSON.parse(await forms.restoreFile.text());
        const toISO = ts => ts?.seconds ? new Date(ts.seconds*1000).toISOString() : (typeof ts==='string'?ts:new Date().toISOString());
        if(json.collections.master_santri) await supabase.from('master_santri').upsert(json.collections.master_santri.map(x=>({id:x.id, nama:x.nama})));
        if(json.collections.master_jenis) await supabase.from('master_jenis').upsert(json.collections.master_jenis.map(x=>({id:x.id, nama:x.nama})));
        if(json.collections.logs_pelanggaran) { const logs = json.collections.logs_pelanggaran.map(x=>({id:x.id, nama:x.nama, jenis:x.jenis, tglMelanggar:x.tglMelanggar, statusTazir:x.statusTazir, keterangan:x.keterangan, createdAt:toISO(x.createdAt)})); for(let i=0; i<logs.length; i+=500) await supabase.from('logs_pelanggaran').upsert(logs.slice(i, i+500)); }
        if(json.collections.santri_catatan) await supabase.from('santri_catatan').upsert(json.collections.santri_catatan.map(x=>({id:x.id, nama:x.nama, isi:x.isi, createdAt:toISO(x.createdAt)})));
        fetchData(); showToast("Restore Berhasil");
    }),
    migrateRange: () => exec(async () => { await supabase.from('logs_pelanggaran').update({jenis:forms.range.newJenis}).gte('tglMelanggar', forms.range.start).lte('tglMelanggar', forms.range.end).eq('jenis', forms.range.oldJenis); fetchData(); showToast("Migrasi Selesai"); }),
    addSantri: () => { if(forms.santri.trim()) exec(async () => { await supabase.from('master_santri').insert([{nama: forms.santri}]); setForms(p=>({...p, santri:""})); fetchData(); }); },
    updateSantri: () => exec(async () => { await supabase.from('master_santri').update({nama:forms.editSantri.nama}).eq('id', forms.editSantri.id); setForms(p=>({...p, editSantri:null})); fetchData(); }),
    deleteSantri: (id) => exec(async () => { await supabase.from('master_santri').delete().eq('id', id); fetchData(); }, "Hapus santri ini?"),
    // Ganti baris approveUser (sekitar baris 296) dengan ini:
approveUser: (u, role) => exec(async () => { 
    console.log("Menyetujui:", u.email, "sebagai:", role);
    
    // 1. Masukkan ke manage_users dengan ROLE yang dipilih dari dropdown
    const { error: insertError } = await supabase.from('manage_users').upsert({ 
        email: u.email, 
        role: role, // Menggunakan parameter 'role' dari tombol, bukan "pengurus"
        nickname: u.nickname, 
        assignedTypes: u.assignedTypes || [] 
    }, { onConflict: 'email' });

    if (insertError) {
        console.error("Gagal insert:", insertError);
        alert("Gagal menerima member: " + insertError.message);
        return;
    }

    // 2. Hapus dari pending
    await supabase.from('users_pending').delete().eq('id', u.id);
    
    fetchData(); 
    showToast(`Berhasil menerima sebagai ${role}`);
}),
    rejectUser: (id) => exec(async () => { 
        await supabase.from('users_pending').delete().eq('id', id); 
        fetchData(); 
        showToast("Permintaan Ditolak");
    }),
    updateUser: (id, types, role) => exec(async () => {
        await supabase.from('manage_users').update({ assignedTypes: types || [], role: role }).eq('id', id);
        fetchData(); 
        showToast("Member Diperbarui!");
    }),
    addManualUser: (f) => exec(async () => {
        if(!f.email || !f.nickname) throw new Error("Email & Nama wajib isi");
        // Gunakan upsert agar jika email sudah ada tinggal terupdate
        await supabase.from('manage_users').upsert([{ 
            email: f.email, 
            nickname: f.nickname, 
            role: f.role, 
            assignedTypes: [] 
        }], { onConflict: 'email' });
        fetchData(); 
        showToast("Member Manual Ditambahkan!");
    }),
    resetMasterData: () => exec(async () => {
        await supabase.from('master_santri').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
        await supabase.from('master_jenis').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('master_santri').insert(MASTER_SANTRI_FIX.map(nama => ({nama})));
        await supabase.from('master_jenis').insert(MASTER_JENIS_FIX.map(nama => ({nama})));
        fetchData(); 
        showToast("Master Data Direset!");
    }),
  }), [forms, data, dailyRes, fetchData, exec, showToast]);

  const groupedLogs = useMemo(() => data.logs.reduce((acc, cur) => { (acc[cur.nama] = acc[cur.nama] || []).push(cur); return acc; }, {}), [data.logs]);
  const groupedNotes = useMemo(() => data.catatan.reduce((acc, cur) => { (acc[cur.nama] = acc[cur.nama] || []).push(cur); return acc; }, {}), [data.catatan]);
  const isAdmin = ui.role === ROLES.ADMIN;
  const inputTypes = useMemo(() => (isAdmin ? data.jenis : data.jenis.filter(j => ui.dbUser?.assignedTypes?.includes(j.nama) || !ui.dbUser?.assignedTypes?.length)), [data.jenis, isAdmin, ui.dbUser]);

  if (ui.user && !ui.dbUser) {
      if (ui.isPending) return <div className="h-screen flex flex-col items-center justify-center p-6 text-center gap-4 bg-[var(--bg-main)]">⏳<h1 className="font-bold text-sm uppercase">Menunggu Persetujuan Admin</h1><p className="text-xs text-[var(--text-muted)]">Permintaan Anda sedang ditinjau.</p><button onClick={() => supabase.auth.signOut()} className="text-red-500 underline text-[10px] font-bold">LOGOUT / BATAL</button></div>;
      
      return (
  <div className="fixed inset-0 z-[60] bg-[var(--bg-main)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="text-center">
              <h2 className="text-lg font-bold text-[var(--text-accent)]">Daftar Pengurus</h2>
              <p className="text-[10px] text-[var(--text-muted)]">Lengkapi data untuk akses aplikasi</p>
          </div>
          
          <div className="space-y-3">
              <div>
                  <label className="text-[10px] font-bold uppercase ml-1">Nama Panggilan</label>
                  <input type="text" placeholder="Contoh: Kang Ahmad" 
                      onChange={e => setForms(p => ({...p, regNickname: e.target.value}))} 
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs" />
              </div>

              <div>
                  <label className="text-[10px] font-bold uppercase ml-1">Daftar Sebagai</label>
                  <select 
                      className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs"
                      onChange={e => setForms(p => ({...p, regRole: e.target.value}))}
                      value={forms.regRole || ROLES.PETUGAS}
                  >
                      <option value={ROLES.PETUGAS}>Petugas Absen / Pencatat</option>
                      <option value={ROLES.PENTAKZIR}>Pentakzir</option>
                  </select>
              </div>

              {/* Sembunyikan daftar pelanggaran JIKA memilih Pentakzir */}
              {(forms.regRole !== ROLES.PENTAKZIR) && (
                  <div>
                      <label className="text-[10px] font-bold uppercase ml-1">Tugas Rekam Data</label>
                      <div className="mt-1 p-3 bg-[var(--bg-sub)] border border-[var(--border)] rounded-lg max-h-40 overflow-y-auto space-y-2">
                          {data.jenis.map(j => (
                              <label key={j.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                  <input type="checkbox" 
                                      checked={forms.regAssignment?.includes(j.nama)} 
                                      onChange={(e) => {
                                          const val = j.nama;
                                          setForms(p => {
                                              const current = p.regAssignment || [];
                                              return {...p, regAssignment: e.target.checked ? [...current, val] : current.filter(x => x !== val)};
                                          });
                                      }} />
                                  {j.nama}
                              </label>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          <button 
              onClick={async () => { 
                  if(!forms.regNickname) return alert("Isi nama panggilan!");
                  setUi(p => ({...p, loading: true}));
                  const { error } = await supabase.from('users_pending').insert([{
                      email: ui.user.email, 
                      uid: ui.user.id, 
                      nickname: forms.regNickname,
                      role: forms.regRole || ROLES.PETUGAS, // Simpan role pilihan
                      assignedTypes: forms.regRole === ROLES.PENTAKZIR ? [] : (forms.regAssignment || [])
                  }]);
                  if(error) alert(error.message);
                  else setUi(p => ({...p, isPending: true}));
                  setUi(p => ({...p, loading: false}));
              }} 
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm">
              KIRIM PERMINTAAN AKSES
          </button>
      </div>
  </div>
);
  }

  return (
    <div className="h-[100dvh] bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col overflow-hidden" onClick={() => setUi(p => ({...p, menu: false}))}>
      <div className="flex-none bg-[var(--bg-header)] px-4 py-3 border-b border-[var(--border)] flex justify-between items-center h-[64px] z-[60]">
        <h1 className="text-lg font-bold text-[var(--text-accent)]">Takziran App</h1>
        <div className="flex gap-1 relative">
          <button onClick={(e) => { e.stopPropagation(); setUi(p => ({...p, dark: !p.dark})); localStorage.setItem("theme", !ui.dark ? "dark" : "light"); }} className="p-2 text-yellow-500"><Icon name={ui.dark ? "Moon" : "Sun"} className="w-6 h-6" /></button>
          <button onClick={(e) => { e.stopPropagation(); setUi(p => ({...p, menu: !p.menu})); }} className="p-2"><Icon name="Menu" className="w-6 h-6" /></button>
          {ui.menu && (
              <div className="absolute right-0 top-12 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl py-2 z-[70]">
                  {['grafik', 'admin'].filter(t => t !== 'admin' || isAdmin).map(t => <button key={t} onClick={() => setUi(p => ({...p, tab: t}))} className="w-full text-left px-5 py-3 capitalize text-sm">{t}</button>)}
                  <button onClick={() => ui.user ? supabase.auth.signOut() : supabase.auth.signInWithOAuth({provider:'google'})} className="w-full text-left px-5 py-3 text-sm font-bold border-t border-[var(--border)]">{ui.user ? "Logout" : "Login"}</button>
              </div>
          )}
        </div>
      </div>
      
      {ui.toast && <div className="fixed top-20 inset-x-0 z-[100] flex justify-center pointer-events-none"><div className="bg-green-600 text-white px-5 py-2 rounded-full shadow-lg text-xs font-bold animate-bounce">{ui.toast}</div></div>}
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {ui.role && ui.tab === "input" ? (
            <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border)] flex flex-col gap-2 h-full">
                <select 
    className="bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" 
    value={forms.input.jenis} 
    onChange={e => setForms(p => ({...p, input: {...p.input, jenis: e.target.value}}))}
>
    <option value="">-- Pilih Pelanggaran --</option>
    {inputTypes.map(j => {
        // Cari petugas dari data.users yang memiliki j.nama di dalam assignedTypes mereka
        const petugas = data.users.find(u => u.assignedTypes?.includes(j.nama))?.nickname;
        
        return (
            <option key={j.id} value={j.nama}>
                {j.nama} {petugas ? `| ${petugas}` : ""}
            </option>
        );
    })}
</select>
                <div className="flex gap-2"><input type="date" className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={forms.input.date} onChange={e => setForms(p => ({...p, input: {...p.input, date: e.target.value}}))} /><div className="flex-1 flex gap-2 justify-center items-center border border-[var(--border)] rounded text-[10px] font-bold uppercase">{["Belum", "Sudah"].map(v => <label key={v} className="flex items-center gap-1"><input type="radio" checked={forms.input.isTazir === v} onChange={() => setForms(p => ({...p, input: {...p.input, isTazir: v}}))} />{v}</label>)}</div></div>
                <textarea className="bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs h-12" placeholder="Keterangan..." value={forms.input.keterangan} onChange={e => setForms(p => ({...p, input: {...p.input, keterangan: e.target.value}}))} />
                <div className="flex-1 bg-[var(--bg-sub)] rounded border border-[var(--border)] p-2 overflow-y-auto grid grid-cols-2 gap-2">
                    {data.santri.map(s => {
                        const sel = forms.input.students.includes(s.nama);
                        return <div key={s.id} onClick={() => setForms(p => ({...p, input: {...p.input, students: sel ? p.input.students.filter(x => x !== s.nama) : [...p.input.students, s.nama]}}))} className={`p-2 rounded border text-[10px] text-center transition cursor-pointer ${sel ? "bg-blue-600 text-white font-bold border-blue-600" : "bg-[var(--bg-input)] border-[var(--border)]"}`}>{s.nama}</div>
                    })}
                </div>
                <button onClick={crud.save} className="bg-blue-600 text-white py-3 rounded-xl font-bold uppercase text-xs shadow-lg">Simpan Data</button>
            </div>
          ) : (
            <div className="space-y-4">
              {(ui.tab === "takziran" || ui.tab === "riwayat") && (
  <SantriList 
    filterTazir={ui.tab === "takziran"} 
    groupedLogs={groupedLogs} 
    groupedNotes={groupedNotes} 
    expanded={expanded} 
    setExpanded={setExpanded} 
    role={ui.role} 
    // TAMBAHKAN BARIS DI BAWAH INI
    users={data.users} 
    actions={{ 
      tazir: crud.tazir, 
      del: id => exec(() => supabase.from('logs_pelanggaran').delete().eq('id', id)), 
      delMany: crud.delMany, 
      addNote: crud.addNote, 
      delNote: crud.delNote 
    }} 
    noteForm={forms.note} 
    setNoteForm={v => setForms(p => ({...p, note: v}))} 
    types={data.jenis} 
  />
)}
              {ui.tab === "grafik" && <GrafikPage fullLogs={data.logs} startDate={forms.filter.start} endDate={forms.filter.end} setStartDate={v => setForms(p => ({...p, filter: {...p.filter, start: v}}))} setEndDate={v => setForms(p => ({...p, filter: {...p.filter, end: v}}))} isDark={ui.dark} />}
              {isAdmin && ui.tab === "admin" && (
                <div className="space-y-4">
                    <div className="flex text-[10px] font-bold border-b border-[var(--border)] bg-[var(--bg-sub)] rounded-t-xl overflow-hidden">
                      {[{id:'users',l:'MEMBER'},{id:'daily',l:'KOREKSI'},{id:'santri',l:'SANTRI'},{id:'range',l:'MIGRASI'},{id:'system',l:'SISTEM'}].map(m => (
                        <button key={m.id} onClick={() => setUi(p => ({...p, batchMode: m.id}))} className={`flex-1 py-4 transition-all ${ui.batchMode===m.id ? "text-blue-600 bg-[var(--bg-card)] border-b-2 border-blue-600" : "text-[var(--text-muted)]"}`}>{m.l} {m.id === 'users' && data.pendingUsers.length > 0 ? "(!)" : ""}</button>
                      ))}
                    </div>
                    <div className="p-2">
                      {ui.batchMode === "users" && (
  <BatchUsers 
    users={data.users} 
    pending={data.pendingUsers} 
    types={data.jenis} 
    onDel={id => exec(() => supabase.from('manage_users').delete().eq('id', id))} 
    onApprove={crud.approveUser} // <--- Pastikan ini crud.approveUser
    onReject={crud.rejectUser} 
    onUpdateAssignment={(id, types) => exec(() => supabase.from('manage_users').update({assignedTypes:types}).eq('id', id))} 
  />
)}
                      {ui.batchMode === "daily" && <BatchDaily types={data.jenis} searchState={forms.daily} setSearch={v => setForms(p => ({...p, daily: v}))} onSearch={crud.searchDaily} result={dailyRes.list} selected={dailyRes.selected} setSelected={v => setDailyRes(p => ({...p, selected: typeof v === 'function' ? v(p.selected) : v}))} target={forms.batchTarget} setTarget={v => setForms(p => ({...p, batchTarget: v}))} onExec={crud.updateBatch} />}
                      {ui.batchMode === "santri" && <BatchSantri santri={data.santri} form={forms.santri} setForm={v => setForms(p => ({...p, santri: v}))} edit={forms.editSantri} setEdit={v => setForms(p => ({...p, editSantri: v}))} onAdd={crud.addSantri} onUpdate={crud.updateSantri} onDel={crud.deleteSantri} />}
                      {ui.batchMode === "range" && (
                        <div className="space-y-2">
                           <div className="grid grid-cols-2 gap-2"><input type="date" className="bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={forms.range.start} onChange={e=>setForms(p=>({...p, range:{...p.range, start:e.target.value}}))} /><input type="date" className="bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={forms.range.end} onChange={e=>setForms(p=>({...p, range:{...p.range, end:e.target.value}}))} /></div>
                           <select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={forms.range.oldJenis} onChange={e=>setForms(p=>({...p, range:{...p.range, oldJenis:e.target.value}}))}><option value="">Pilih Pelanggaran Lama...</option>{data.jenis.map(j=><option key={j.id} value={j.nama}>{j.nama}</option>)}</select>
                           <select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 text-xs" value={forms.range.newJenis} onChange={e=>setForms(p=>({...p, range:{...p.range, newJenis:e.target.value}}))}><option value="">Pilih Pelanggaran Baru...</option>{data.jenis.map(j=><option key={j.id} value={j.nama}>{j.nama}</option>)}</select>
                           <button onClick={crud.migrateRange} className="w-full bg-amber-600 text-white py-3 rounded-lg font-bold text-xs uppercase shadow-md">Eksekusi Migrasi Data</button>
                        </div>
                      )}
                      {ui.batchMode === "system" && (
                        <div className="space-y-6">
                           <div className="bg-[var(--bg-sub)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                              <h3 className="text-xs font-bold uppercase text-cyan-700">Backup & Restore</h3>
                              <button onClick={crud.backup} className="w-full bg-cyan-700 text-white font-bold py-3 rounded-lg text-xs uppercase">Download Backup (JSON)</button>
                              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]"><input type="file" accept=".json" onChange={e => setForms(p => ({...p, restoreFile: e.target.files[0]}))} className="text-[10px]" /><button onClick={crud.processRestore} disabled={!forms.restoreFile} className="bg-teal-600 text-white font-bold py-3 rounded-lg text-xs uppercase disabled:opacity-50">Restore Data</button></div>
                           </div>
                           <BatchDanger form={forms.bulkDel} setForm={v => setForms(p => ({...p, bulkDel: v}))} onExec={() => exec(() => supabase.from('logs_pelanggaran').delete().gte('tglMelanggar', forms.bulkDel.start).lte('tglMelanggar', forms.bulkDel.end), "Hapus permanen data?")} loading={ui.loading} onResetMaster={crud.resetMasterData} />
                        </div>
                      )}
                    </div>
                </div>
              )}
            </div>
          )}
      </div>
      
      <div className="flex-none bg-[var(--bg-header)] border-t border-[var(--border)] flex justify-around items-center h-[65px] z-50">
        {ui.role && <button onClick={() => setUi(p => ({...p, tab: 'input'}))} className={`flex flex-col items-center w-full ${ui.tab==='input' ? "text-blue-600" : "text-[var(--text-muted)]"}`}><span className="text-xl">📝</span><span className="text-[10px] font-bold">Input</span></button>}
        {['takziran', 'riwayat'].map(t => <button key={t} onClick={() => setUi(p => ({...p, tab: t}))} className={`flex flex-col items-center w-full ${ui.tab===t ? "text-blue-600" : "text-[var(--text-muted)]"}`}><span className="text-xl">{t==='takziran'?'⚠️':'📜'}</span><span className="text-[10px] font-bold capitalize">{t}</span></button>)}
      </div>
    </div>
  );
}