import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from "react";
import { supabase } from "./supabaseClient";
import { ROLES, SUPER_ADMINS, getDate, getUUID } from "./utils";
import { GoogleLogo, Icon } from "./components/SharedUI";

const WaliDashboard = lazy(() => import('./pages/WaliDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

export default function App() {
    const [ui, setUi] = useState({
        user: null, role: null, dbUser: null,
        isPending: false, isInitializing: true,
        tab: "takziran", menu: false, loading: false, toast: null,
        dark: localStorage.getItem("theme") !== "light", batchMode: "users",
        fontSize: 0,
        isWaliMode: false, waliId: null
    });
    
    const [data, setData] = useState({ santri: [], jenis: [], logs: [], catatan: [], prestasi: [], users: [], pendingUsers: [] });
    
    const [forms, setForms] = useState({
        input: { jenis: "", date: getDate(), students: [], isTazir: "Belum", keterangan: "" },
        inputSearch: "", note: "", prestasiForm: "", santri: "", editSantri: null, jenisInput: "", editJenis: null,
        bulkDel: { start: getDate(), end: getDate() }, daily: { date: getDate(), jenis: "" }, batchTarget: { newJenis: "", newDate: "" },
        range: { start: getDate(new Date(Date.now() - 7 * 864e5)), end: getDate(), oldJenis: "", newJenis: "" }, restoreFile: null,
        filter: { start: getDate(new Date(Date.now() - 30 * 864e5)), end: getDate() },
        regNickname: "", regRole: ROLES.PETUGAS, regAssignment: [], regTags: [], search: "",
        filterTags: [], sortMode: "alpha"
    });
    
    const formsRef = useRef(forms);
    const dataRef = useRef(data);
    const uiRef = useRef(ui);
    
    useEffect(() => { 
        formsRef.current = forms; 
        dataRef.current = data;
        uiRef.current = ui;
    }, [forms, data, ui]);

    const [expanded, setExpanded] = useState({});
    const [dailyRes, setDailyRes] = useState({ list: [], selected: [] });
    const dailyResRef = useRef(dailyRes);
    useEffect(() => { dailyResRef.current = dailyRes; }, [dailyRes]);

    const logActivity = useCallback(async (action) => {
        const dbUser = uiRef.current.dbUser;
        if (!dbUser?.id) return;
        const now = new Date().toISOString();
        try {
            await supabase.from('manage_users').update({ last_seen: now, last_action: action }).eq('id', dbUser.id);
            await supabase.from('activity_logs').insert({ email: dbUser.email, nickname: dbUser.nickname, action: action, created_at: now });
        } catch (e) { console.error("Log error", e); }
    }, []);

    const allUniqueTags = useMemo(() => {
        const tags = new Set();
        data.santri.forEach(s => { if (s.labels && Array.isArray(s.labels)) s.labels.forEach(tag => tags.add(tag)); });
        return Array.from(tags).sort();
    }, [data.santri]);

    const allowedSantriByTag = useMemo(() => {
        const userTags = ui.dbUser?.assignedTags || [];
        if (ui.role === ROLES.ADMIN || userTags.length === 0) return data.santri;
        return data.santri.filter(s => s.labels && userTags.some(t => s.labels.includes(t)));
    }, [data.santri, ui.dbUser?.assignedTags, ui.role]);

    // OPTIMASI: O(1) Set Lookup untuk grouped computations
    const groupedLogs = useMemo(() => {
        const allowedNamesSet = new Set(allowedSantriByTag.map(s => s.nama));
        const filtered = data.logs.filter(l => allowedNamesSet.has(l.nama));
        return filtered.reduce((acc, cur) => { (acc[cur.nama] = acc[cur.nama] || []).push(cur); return acc; }, {});
    }, [data.logs, allowedSantriByTag]);

    const groupedNotes = useMemo(() => {
        const allowedNamesSet = new Set(allowedSantriByTag.map(s => s.nama));
        const filtered = data.catatan.filter(c => allowedNamesSet.has(c.nama));
        return filtered.reduce((acc, cur) => { (acc[cur.nama] = acc[cur.nama] || []).push(cur); return acc; }, {});
    }, [data.catatan, allowedSantriByTag]);

    const groupedPrestasi = useMemo(() => {
        const allowedNamesSet = new Set(allowedSantriByTag.map(s => s.nama));
        const filtered = data.prestasi.filter(p => allowedNamesSet.has(p.nama));
        return filtered.reduce((acc, cur) => { (acc[cur.nama] = acc[cur.nama] || []).push(cur); return acc; }, {});
    }, [data.prestasi, allowedSantriByTag]);

    const fetchData = useCallback(async (isBackground = false) => {
        if (!uiRef.current.user) return;
        if (!isBackground) setUi(p => ({ ...p, loading: true }));
        try {
            const [s, j, u, p, l, c, pr] = await Promise.all([
                supabase.from('master_santri').select('*').order('nama'),
                supabase.from('master_jenis').select('*').order('nama'),
                supabase.from('manage_users').select('*').order('email'),
                supabase.from('users_pending').select('*').order('createdAt'),
                supabase.from('logs_pelanggaran').select('*').order('tglMelanggar', { ascending: false }),
                supabase.from('santri_catatan').select('*').order('createdAt', { ascending: false }),
                supabase.from('santri_prestasi').select('*').order('createdAt', { ascending: false })
            ]);
            setData({ santri: s.data || [], jenis: j.data || [], users: u.data || [], pendingUsers: p.data || [], logs: l.data || [], catatan: c.data || [], prestasi: pr.data || [] });
        } catch (err) { console.error("Fetch Error:", err); }
        finally { if (!isBackground) setUi(p => ({ ...p, loading: false })); }
    }, []); 

    useEffect(() => {
        const initFlow = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const waliId = urlParams.get('wali');
            
            if (waliId) {
                setUi(p => ({ ...p, isInitializing: false, isWaliMode: true, waliId: waliId }));
                return; 
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await checkUser(session.user);
            } else {
                setUi(p => ({ ...p, isInitializing: false }));
            }
        };

        const checkUser = async (u) => {
            if (!u) { setUi(p => ({ ...p, user: null, role: null, dbUser: null, isPending: false, isInitializing: false })); return; }
            if (SUPER_ADMINS.includes(u.email)) {
                let { data: ex } = await supabase.from('manage_users').select('*').eq('email', u.email).maybeSingle();
                if (!ex) { const { data: n, error } = await supabase.from('manage_users').insert([{ email: u.email, role: 'admin', nickname: 'Super Admin', last_seen: new Date().toISOString(), last_action: 'Login' }]).select().single(); if (!error) ex = n; }
                else await supabase.from('manage_users').update({ last_seen: new Date().toISOString(), last_action: 'Login' }).eq('id', ex.id);
                setUi(p => ({ ...p, user: u, role: 'admin', dbUser: ex, isPending: false, isInitializing: false, tab: p.user ? p.tab : 'takziran' }));
                return;
            }
            try {
                const { data: found } = await supabase.from('manage_users').select('*').eq('email', u.email).maybeSingle();
                if (found) {
                    await supabase.from('manage_users').update({ last_seen: new Date().toISOString(), last_action: 'Login' }).eq('id', found.id);
                    const defaultTab = found.role === ROLES.WALI_KELAS ? 'riwayat' : 'takziran';
                    const defaultBatch = found.role === ROLES.WALI_KELAS ? 'wali' : 'users';
                    setUi(p => ({ ...p, user: u, role: found.role, dbUser: found, isPending: false, isInitializing: false, tab: p.user ? p.tab : defaultTab, batchMode: p.user ? p.batchMode : defaultBatch }));
                } else {
                    const { data: pend } = await supabase.from('users_pending').select('*').eq('email', u.email).maybeSingle();
                    setUi(p => ({ ...p, user: u, isPending: !!pend, dbUser: null, isInitializing: false }));
                }
            } catch (err) { setUi(p => ({ ...p, isInitializing: false })); }
        };

        initFlow();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (evt, session) => {
            const isWaliURL = new URLSearchParams(window.location.search).has('wali');
            if (isWaliURL) return;
            if (evt === 'SIGNED_IN' && session?.user) checkUser(session.user);
            else if (evt === 'SIGNED_OUT') setUi(p => ({ ...p, user: null, role: null, dbUser: null, isPending: false, isInitializing: false }));
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (ui.user && !ui.isWaliMode) fetchData();
        const sub = supabase.channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'logs_pelanggaran' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'manage_users' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users_pending' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'master_santri' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'master_jenis' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'santri_prestasi' }, () => fetchData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'santri_catatan' }, () => fetchData(true))
            .subscribe();
            
        return () => { supabase.removeChannel(sub); }
    }, [fetchData, ui.user, ui.isWaliMode]);

    useEffect(() => { document.body.classList.toggle('dark-mode', ui.dark); }, [ui.dark]);
    useEffect(() => { document.documentElement.style.fontSize = ['14px', '16px', '18px'][ui.fontSize]; }, [ui.fontSize]);

    const showToast = useCallback((msg) => { setUi(p => ({ ...p, toast: msg })); setTimeout(() => setUi(p => ({ ...p, toast: null })), 3000); }, []);
    const exec = useCallback(async (fn, confirmMsg) => { if (confirmMsg && !window.confirm(confirmMsg)) return; setUi(p => ({ ...p, loading: true })); try { await fn(); } catch (e) { alert(e.message); } setUi(p => ({ ...p, loading: false })); }, []);

    const crud = useMemo(() => ({
        save: (e) => { 
            e.preventDefault(); 
            const f = formsRef.current.input; 
            if (!f.jenis || !f.students.length) return alert("Pilih data!"); 
            exec(async () => { 
                const dbUser = uiRef.current.dbUser;
                const payload = f.students.map(nama => ({ nama, jenis: f.jenis, tglMelanggar: f.date, statusTazir: 'Belum', keterangan: f.keterangan, inputBy: dbUser?.nickname || "System" })); 
                await supabase.from('logs_pelanggaran').insert(payload); 
                await logActivity(`Input: ${f.jenis} (${f.students.length} Santri)`); 
                setForms(p => ({ ...p, input: { ...p.input, students: [], keterangan: "" }, inputSearch: "" })); 
                showToast("Berhasil Disimpan"); 
            }); 
        },
        delMany: (ids) => exec(async () => { await supabase.from('logs_pelanggaran').delete().in('id', ids); setData(prev => ({ ...prev, logs: prev.logs.filter(item => !ids.includes(item.id)) })); await logActivity(`Menghapus ${ids.length} item pelanggaran`); showToast("Terhapus"); }, `Hapus ${ids.length} item?`),
        del: (id) => exec(async () => { await supabase.from('logs_pelanggaran').delete().eq('id', id); setData(prev => ({ ...prev, logs: prev.logs.filter(item => item.id !== id) })); await logActivity(`Menghapus 1 item pelanggaran`); showToast("Terhapus"); }),
        delAll: (nama) => exec(async () => { await supabase.from('logs_pelanggaran').delete().eq('nama', nama); setData(prev => ({ ...prev, logs: prev.logs.filter(l => l.nama !== nama) })); await logActivity(`Menghapus seluruh riwayat ${nama}`); showToast(`Semua data ${nama} dihapus`); }, `YAKIN? Semua riwayat pelanggaran ${nama} akan hilang selamanya!`),
        tazir: (nama, e) => { 
            e.stopPropagation(); 
            exec(async () => { 
                const tazirName = uiRef.current.dbUser?.nickname || "System"; 
                setData(prev => ({ ...prev, logs: prev.logs.map(l => (l.nama === nama && l.statusTazir === 'Belum') ? { ...l, statusTazir: 'Sudah', tazirBy: tazirName } : l) })); 
                await supabase.from('logs_pelanggaran').update({ statusTazir: "Sudah", tazirBy: tazirName }).eq('nama', nama).eq('statusTazir', 'Belum'); 
                await logActivity(`Menakzir: ${nama}`); 
                showToast("Status Diperbarui"); 
            }); 
        },
        addNote: (nama) => { const n = formsRef.current.note; if (n.trim()) exec(async () => { const newId = getUUID(); const { data: newNote, error } = await supabase.from('santri_catatan').insert([{ id: newId, nama, isi: n }]).select().single(); if (error) throw error; setData(p => ({ ...p, catatan: [newNote, ...p.catatan] })); setForms(p => ({ ...p, note: "" })); await logActivity(`Menambah catatan untuk ${nama}`); showToast("Catatan Ditambahkan"); }); },
        updateNote: (id, isi) => exec(async () => { await supabase.from('santri_catatan').update({ isi }).eq('id', id); setData(p => ({ ...p, catatan: p.catatan.map(c => c.id === id ? { ...c, isi } : c) })); await logActivity(`Mengedit catatan santri`); showToast("Catatan Diperbarui"); }),
        delNote: (id) => exec(async () => { setData(p => ({ ...p, catatan: p.catatan.filter(c => c.id !== id) })); await supabase.from('santri_catatan').delete().eq('id', id); await logActivity(`Menghapus catatan santri`); showToast("Catatan Dihapus"); }),
        addPrestasi: (nama) => { const pName = formsRef.current.prestasiForm; if (pName.trim()) exec(async () => { const newId = getUUID(); const { data: newPrestasi, error } = await supabase.from('santri_prestasi').insert([{ id: newId, nama, prestasi: pName }]).select().single(); if (error) throw error; setData(p => ({ ...p, prestasi: [newPrestasi, ...p.prestasi] })); setForms(p => ({ ...p, prestasiForm: "" })); await logActivity(`Menambah prestasi untuk ${nama}`); showToast("Prestasi Ditambahkan"); }); },
        updatePrestasi: (id, prestasi) => exec(async () => { await supabase.from('santri_prestasi').update({ prestasi }).eq('id', id); setData(p => ({ ...p, prestasi: p.prestasi.map(pr => pr.id === id ? { ...pr, prestasi } : pr) })); await logActivity(`Mengedit prestasi santri`); showToast("Prestasi Diperbarui"); }),
        delPrestasi: (id) => exec(async () => { setData(p => ({ ...p, prestasi: p.prestasi.filter(pr => pr.id !== id) })); await supabase.from('santri_prestasi').delete().eq('id', id); await logActivity(`Menghapus prestasi santri`); showToast("Prestasi Dihapus"); }),
        updateSysWa: (no) => exec(async () => {
            const sysWaRecord = dataRef.current.catatan.find(c => c.nama === 'SYSTEM_WA');
            const idToUse = sysWaRecord ? sysWaRecord.id : getUUID();
            await supabase.from('santri_catatan').upsert({ id: idToUse, nama: 'SYSTEM_WA', isi: no, createdAt: new Date().toISOString() });
            await logActivity(`Memperbarui Nomor WA Pengurus`);
            showToast("Nomor WA Disimpan!");
            fetchData(true); 
        }),
        searchDaily: async () => { const f = formsRef.current.daily; if (!f.jenis) return; const { data: res } = await supabase.from('logs_pelanggaran').select('*').eq("tglMelanggar", f.date).eq("jenis", f.jenis); setDailyRes({ list: res || [], selected: (res || []).map(r => r.id) }); setForms(p => ({ ...p, batchTarget: { newJenis: f.jenis, newDate: f.date } })); },
        updateBatch: (action) => exec(async () => { const bt = formsRef.current.batchTarget; const selected = dailyResRef.current.selected; if (action === 'delete') await supabase.from('logs_pelanggaran').delete().in('id', selected); else await supabase.from('logs_pelanggaran').update({ jenis: bt.newJenis, tglMelanggar: bt.newDate }).in('id', selected); await logActivity(`Aksi massal (${action}) pada riwayat harian`); showToast("Batch Sukses"); setDailyRes({ list: [], selected: [] }); }, `Konfirmasi ${action}?`),
        backup: () => { const currentData = dataRef.current; const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([JSON.stringify({ collections: { master_santri: currentData.santri, master_jenis: currentData.logs, logs_pelanggaran: currentData.logs, santri_catatan: currentData.catatan, santri_prestasi: currentData.prestasi } }, null, 2)], { type: "application/json" })); link.download = `backup_${getDate()}.json`; link.click(); },
        processRestore: () => exec(async () => { const json = JSON.parse(await formsRef.current.restoreFile.text()); const toISO = ts => ts?.seconds ? new Date(ts.seconds * 1000).toISOString() : (typeof ts === 'string' ? ts : new Date().toISOString()); if (json.collections.master_santri) await supabase.from('master_santri').upsert(json.collections.master_santri.map(x => ({ id: x.id, nama: x.nama, labels: x.labels || [] }))); if (json.collections.master_jenis) await supabase.from('master_jenis').upsert(json.collections.master_jenis.map(x => ({ id: x.id, nama: x.nama }))); if (json.collections.logs_pelanggaran) { const logs = json.collections.logs_pelanggaran.map(x => ({ id: x.id, nama: x.nama, jenis: x.jenis, tglMelanggar: x.tglMelanggar, statusTazir: x.statusTazir, keterangan: x.keterangan, createdAt: toISO(x.createdAt) })); for (let i = 0; i < logs.length; i += 500) await supabase.from('logs_pelanggaran').upsert(logs.slice(i, i + 500)); } if (json.collections.santri_catatan) await supabase.from('santri_catatan').upsert(json.collections.santri_catatan.map(x => ({ id: x.id || getUUID(), nama: x.nama, isi: x.isi, createdAt: toISO(x.createdAt) }))); if (json.collections.santri_prestasi) await supabase.from('santri_prestasi').upsert(json.collections.santri_prestasi.map(x => ({ id: x.id || getUUID(), nama: x.nama, prestasi: x.prestasi, createdAt: toISO(x.createdAt) }))); await logActivity(`Melakukan Restore Data Database`); showToast("Restore Berhasil"); }),
        migrateRange: () => exec(async () => { const r = formsRef.current.range; await supabase.from('logs_pelanggaran').update({ jenis: r.newJenis }).gte('tglMelanggar', r.start).lte('tglMelanggar', r.end).eq('jenis', r.oldJenis); await logActivity(`Migrasi range data pelanggaran massal`); showToast("Migrasi Selesai"); }),
        addSantri: () => { const s = formsRef.current.santri; if (s.trim()) exec(async () => { const { data: newS, error } = await supabase.from('master_santri').insert([{ nama: s, labels: [] }]).select(); if (error) throw error; setData(p => ({ ...p, santri: [...p.santri, ...newS].sort((a, b) => a.nama.localeCompare(b.nama)) })); setForms(p => ({ ...p, santri: "" })); await logActivity(`Menambah santri baru: ${s}`); showToast("Santri ditambahkan"); }); },
        updateSantri: () => exec(async () => { const es = formsRef.current.editSantri; await supabase.from('master_santri').update({ nama: es.nama, labels: es.labels || [] }).eq('id', es.id); setData(p => ({ ...p, santri: p.santri.map(s => s.id === es.id ? { ...s, nama: es.nama, labels: es.labels || [] } : s).sort((a, b) => a.nama.localeCompare(b.nama)) })); setForms(p => ({ ...p, editSantri: null })); await logActivity(`Memperbarui data santri`); showToast("Data diperbarui"); }),
        deleteSantri: (id) => exec(async () => { await supabase.from('master_santri').delete().eq('id', id); setData(p => ({ ...p, santri: p.santri.filter(s => s.id !== id) })); await logActivity(`Menghapus data santri`); showToast("Santri dihapus"); }, "Hapus santri ini?"),
        deleteManySantri: (ids) => exec(async () => { await supabase.from('master_santri').delete().in('id', ids); setData(p => ({ ...p, santri: p.santri.filter(s => !ids.includes(s.id)) })); await logActivity(`Menghapus ${ids.length} data santri`); showToast(`${ids.length} Santri dihapus`); }, `Hapus ${ids.length} santri terpilih? Data tidak dapat dikembalikan!`),
        addJenis: () => { const j = formsRef.current.jenisInput; if (j.trim()) exec(async () => { const { data: newJ, error } = await supabase.from('master_jenis').insert([{ nama: j.trim() }]).select(); if (error) throw error; setData(p => ({ ...p, jenis: [...p.jenis, ...newJ].sort((a, b) => a.nama.localeCompare(b.nama)) })); setForms(p => ({ ...p, jenisInput: "" })); await logActivity(`Menambah jenis pelanggaran: ${j.trim()}`); showToast("Jenis ditambahkan"); }); },
        updateJenis: () => exec(async () => { const ej = formsRef.current.editJenis; if (!ej || !ej.nama.trim()) return; await supabase.from('master_jenis').update({ nama: ej.nama.trim() }).eq('id', ej.id); setData(p => ({ ...p, jenis: p.jenis.map(j => j.id === ej.id ? { ...j, nama: ej.nama.trim() } : j).sort((a, b) => a.nama.localeCompare(b.nama)) })); setForms(p => ({ ...p, editJenis: null })); await logActivity(`Memperbarui jenis pelanggaran`); showToast("Jenis diperbarui"); }),
        deleteJenis: (id) => exec(async () => { await supabase.from('master_jenis').delete().eq('id', id); setData(p => ({ ...p, jenis: p.jenis.filter(j => j.id !== id) })); await logActivity(`Menghapus jenis pelanggaran`); showToast("Jenis dihapus"); }, "Hapus jenis pelanggaran ini? Awas, data lama mungkin kehilangan referensi."),
        approveUser: (u, role) => exec(async () => { await supabase.from('manage_users').upsert({ email: u.email, role: role, nickname: u.nickname, assignedTypes: u.assignedTypes || [], assignedTags: u.assignedTags || [] }, { onConflict: 'email' }); await supabase.from('users_pending').delete().eq('id', u.id); setData(p => ({ ...p, users: [...p.users, { ...u, role, assignedTypes: u.assignedTypes || [], assignedTags: u.assignedTags || [] }], pendingUsers: p.pendingUsers.filter(x => x.id !== u.id) })); await logActivity(`Menerima member baru: ${u.nickname}`); showToast(`Berhasil menerima sebagai ${role}`); }),
        rejectUser: (id) => exec(async () => { await supabase.from('users_pending').delete().eq('id', id); setData(p => ({ ...p, pendingUsers: p.pendingUsers.filter(x => x.id !== id) })); await logActivity(`Menolak permintaan akses member`); showToast("Permintaan Ditolak"); }),
        delMember: (id) => exec(async () => { await supabase.from('manage_users').delete().eq('id', id); setData(p => ({ ...p, users: p.users.filter(u => u.id !== id) })); await logActivity(`Menghapus akses member`); showToast("Member Dihapus"); }),
        updateUser: (id, types, role, nickname, tags) => exec(async () => { await supabase.from('manage_users').update({ assignedTypes: types || [], assignedTags: tags || [], role: role, nickname: nickname }).eq('id', id); setData(p => ({ ...p, users: p.users.map(u => u.id === id ? { ...u, role, assignedTypes: types, assignedTags: tags, nickname } : u) })); await logActivity(`Memperbarui akses/role member`); showToast("Member Diperbarui!"); }),
        addManualUser: (f) => exec(async () => { if (!f.email || !f.nickname) throw new Error("Email & Nama wajib isi"); await supabase.from('manage_users').upsert([{ email: f.email, nickname: f.nickname, role: f.role, assignedTypes: [], assignedTags: [] }], { onConflict: 'email' }); await logActivity(`Menambah member manual: ${f.nickname}`); showToast("Member Manual Ditambahkan!"); })
    }), [exec, showToast, logActivity]); 

    const handleSetSantri = useCallback(v => setForms(p => ({ ...p, santri: typeof v === 'function' ? v(p.santri) : v })), []);
    const handleSetEditSantri = useCallback(v => setForms(p => ({ ...p, editSantri: typeof v === 'function' ? v(p.editSantri) : v })), []);
    const handleSetJenisInput = useCallback(v => setForms(p => ({ ...p, jenisInput: typeof v === 'function' ? v(p.jenisInput) : v })), []);
    const handleSetEditJenis = useCallback(v => setForms(p => ({ ...p, editJenis: typeof v === 'function' ? v(p.editJenis) : v })), []);
    const handleSetDailySearch = useCallback(v => setForms(p => ({ ...p, daily: typeof v === 'function' ? v(p.daily) : v })), []);
    const handleSetBatchTarget = useCallback(v => setForms(p => ({ ...p, batchTarget: typeof v === 'function' ? v(p.batchTarget) : v })), []);
    const handleSetRangeForm = useCallback(v => setForms(p => ({ ...p, range: typeof v === 'function' ? v(p.range) : v })), []);
    const handleSetNoteForm = useCallback(v => setForms(p => ({ ...p, note: typeof v === 'function' ? v(p.note) : v })), []);
    const handleSetPrestasiForm = useCallback(v => setForms(p => ({ ...p, prestasiForm: typeof v === 'function' ? v(p.prestasiForm) : v })), []);
    const handleSetBulkDelForm = useCallback(v => setForms(p => ({ ...p, bulkDel: typeof v === 'function' ? v(p.bulkDel) : v })), []);
    const handleSetRestoreFile = useCallback(v => setForms(p => ({ ...p, restoreFile: typeof v === 'function' ? v(p.restoreFile) : v })), []);
    const handleDailySelected = useCallback(v => setDailyRes(p => ({ ...p, selected: typeof v === 'function' ? v(p.selected) : v })), []);
    const handleBulkDelExec = useCallback(() => { exec(() => supabase.from('logs_pelanggaran').delete().gte('tglMelanggar', formsRef.current.bulkDel.start).lte('tglMelanggar', formsRef.current.bulkDel.end), "Hapus permanen data?"); }, [exec]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUi({ user: null, role: null, dbUser: null, isPending: false, isInitializing: false, tab: "takziran", menu: false, loading: false, toast: null, dark: ui.dark, fontSize: 0, batchMode: "users", isWaliMode: false, waliId: null });
        setData({ santri: [], jenis: [], logs: [], catatan: [], prestasi: [], users: [], pendingUsers: [] });
    };

    const toggleFilterTag = useCallback((tag) => {
        setForms(p => {
            const current = p.filterTags || [];
            return { ...p, filterTags: current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag] };
        });
    }, []);

    const isAdmin = ui.role === ROLES.ADMIN;
    const inputTypes = useMemo(() => (isAdmin ? data.jenis : data.jenis.filter(j => ui.dbUser?.assignedTypes?.includes(j.nama) || !ui.dbUser?.assignedTypes?.length)), [data.jenis, isAdmin, ui.dbUser]);

    // OPTIMASI: Stable context reference 
    const ctx = useMemo(() => ({
        ui, setUi, data, setData, forms, setForms, crud,
        allUniqueTags, allowedSantriByTag, groupedLogs, groupedNotes, groupedPrestasi,
        inputTypes, toggleFilterTag, handleLogout,
        expanded, setExpanded, dailyRes, handleDailySelected,
        handleSetNoteForm, handleSetPrestasiForm, handleSetDailySearch, handleSetBatchTarget,
        handleSetRangeForm, handleSetSantri, handleSetEditSantri,
        handleSetJenisInput, handleSetEditJenis, handleSetBulkDelForm,
        handleSetRestoreFile, handleBulkDelExec
    }), [
        ui, data, forms, crud, allUniqueTags, allowedSantriByTag, groupedLogs, groupedNotes, groupedPrestasi,
        inputTypes, toggleFilterTag, expanded, dailyRes, handleDailySelected, handleSetNoteForm, handleSetPrestasiForm, 
        handleSetDailySearch, handleSetBatchTarget, handleSetRangeForm, handleSetSantri, handleSetEditSantri,
        handleSetJenisInput, handleSetEditJenis, handleSetBulkDelForm, handleSetRestoreFile, handleBulkDelExec
    ]);

    if (ui.isInitializing) return <div className="h-[100dvh] flex flex-col items-center justify-center bg-[var(--bg-main)]"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div><p className="text-xs font-bold text-[var(--text-muted)] animate-pulse">Memuat Sesi...</p></div>;
    
    if (ui.isWaliMode) {
        return (
            <Suspense fallback={<div className="h-[100dvh] flex items-center justify-center bg-[#F4F7F9]">Memuat Data Wali...</div>}>
                <WaliDashboard santriId={ui.waliId} />
            </Suspense>
        );
    }

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
                        <div>
                            <label className="text-[10px] font-bold uppercase ml-1">Daftar Sebagai</label>
                            <select className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs" onChange={e => setForms(p => ({ ...p, regRole: e.target.value }))} value={forms.regRole || ROLES.PETUGAS}>
                                <option value={ROLES.PETUGAS}>Petugas Absen / Pencatat</option>
                                <option value={ROLES.PENTAKZIR}>Pentakzir</option>
                                <option value={ROLES.WALI_KELAS}>Wali Kelas</option>
                            </select>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] font-bold uppercase ml-1">Batasi Akses Tag/Label (Opsional)</label>
                                <button onClick={() => setForms(p => ({ ...p, regTags: p.regTags?.length === allUniqueTags.length ? [] : [...allUniqueTags] }))} className="text-[10px] text-blue-600 font-bold underline">{forms.regTags?.length === allUniqueTags.length ? "Hapus Semua" : "Pilih Semua"}</button>
                            </div>
                            <div className="p-2 bg-[var(--bg-sub)] border border-[var(--border)] rounded-lg max-h-32 overflow-y-auto space-y-1">
                                {allUniqueTags.length === 0 && <div className="text-[10px] italic text-[var(--text-muted)] p-1">Belum ada tag/label pada data santri.</div>}
                                {allUniqueTags.map(t => (
                                    <label key={t} className="flex items-center gap-2 text-xs cursor-pointer p-1 hover:bg-[var(--bg-hover)] rounded">
                                        <input type="checkbox" checked={forms.regTags?.includes(t)} onChange={(e) => { const val = t; setForms(p => { const current = p.regTags || []; return { ...p, regTags: e.target.checked ? [...current, val] : current.filter(x => x !== val) }; }); }} />
                                        {t}
                                    </label>
                                ))}
                            </div>
                            <p className="text-[9px] text-[var(--text-muted)] mt-1 px-1">*Jika dikosongkan, Anda akan memiliki akses ke <b>SEMUA</b> santri secara default.</p>
                        </div>
                        {(forms.regRole === ROLES.PETUGAS) && (<div><div className="flex justify-between items-center mb-1"><label className="text-[10px] font-bold uppercase ml-1">Tugas Rekam Data</label><button onClick={() => setForms(p => ({ ...p, regAssignment: p.regAssignment?.length === data.jenis.length ? [] : data.jenis.map(j => j.nama) }))} className="text-[10px] text-blue-600 font-bold underline">{forms.regAssignment?.length === data.jenis.length ? "Hapus Semua" : "Pilih Semua"}</button></div><div className="p-3 bg-[var(--bg-sub)] border border-[var(--border)] rounded-lg max-h-40 overflow-y-auto space-y-2">{data.jenis.map(j => (<label key={j.id} className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={forms.regAssignment?.includes(j.nama)} onChange={(e) => { const val = j.nama; setForms(p => { const current = p.regAssignment || []; return { ...p, regAssignment: e.target.checked ? [...current, val] : current.filter(x => x !== val) }; }); }} />{j.nama}</label>))}</div></div>)}
                    </div>
                    <button onClick={async () => { 
                        if (!forms.regNickname) return alert("Isi nama panggilan!"); 
                        setUi(p => ({ ...p, loading: true })); 
                        const { error } = await supabase.from('users_pending').insert([{ email: ui.user.email, uid: ui.user.id, nickname: forms.regNickname, role: forms.regRole || ROLES.PETUGAS, assignedTypes: forms.regRole === ROLES.PETUGAS ? (forms.regAssignment || []) : [], assignedTags: forms.regTags || [] }]); 
                        if (error) alert(error.message); else setUi(p => ({ ...p, isPending: true })); 
                        setUi(p => ({ ...p, loading: false })); 
                    }} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm">KIRIM PERMINTAAN AKSES</button>
                </div>
            </div>
        );
    }

    return (
        <Suspense fallback={<div className="h-[100dvh] flex items-center justify-center bg-[var(--bg-main)]">Memuat Dashboard...</div>}>
            <AdminDashboard ctx={ctx} />
        </Suspense>
    );
}