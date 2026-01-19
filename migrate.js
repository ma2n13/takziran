import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://mqhszwgdnezdaonwhopb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHN6d2dkbmV6ZGFvbndob3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTEzODMsImV4cCI6MjA4NDM2NzM4M30.PezVTA-hIaK88uCDdeWwp49C7Cg44crz3UpGToxtNeU' // Ambil dari Dashboard Supabase -> Project Settings -> API
);

const filePath = 'D:/Documents/Documents/backup_takziran_2026-1-19.json';

async function migrate() {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const collections = data.collections;

    console.log("Memulai migrasi...");

    // 1. Migrasi Master Santri
    if (collections.master_santri) {
      const santri = collections.master_santri.map(s => ({ nama: s.nama }));
      await supabase.from('master_santri').upsert(santri, { onConflict: 'nama' });
      console.log("✅ Master Santri Berhasil");
    }

    // 2. Migrasi Manage Users (Data Petugas)
    if (collections.manage_users) {
      const users = collections.manage_users.map(u => ({
        email: u.email,
        nickname: u.nickname || u.email.split('@')[0],
        role: u.role || 'pengurus',
        assignedTypes: u.assignedTypes || []
      }));
      await supabase.from('manage_users').upsert(users, { onConflict: 'email' });
      console.log("✅ Data Pengurus Berhasil");
    }

    // 3. Migrasi Logs (LOGIKA TANGGAL YANG DIPERBAIKI)
    if (collections.logs_pelanggaran) {
      const logs = collections.logs_pelanggaran.map(l => {
        let cleanDate;
        
        // Cek apakah tglMelanggar berupa objek Firestore atau String
        if (l.tglMelanggar && typeof l.tglMelanggar === 'object' && l.tglMelanggar.seconds) {
          cleanDate = new Date(l.tglMelanggar.seconds * 1000).toISOString().split('T')[0];
        } else if (typeof l.tglMelanggar === 'string' && l.tglMelanggar.includes('-')) {
          cleanDate = l.tglMelanggar; // Sudah format YYYY-MM-DD
        } else {
          cleanDate = new Date().toISOString().split('T')[0]; // Fallback ke hari ini
        }

        return {
          nama: l.nama,
          jenis: l.jenis,
          statusTazir: l.statusTazir || "Belum",
          keterangan: l.keterangan || "",
          tglMelanggar: cleanDate,
          recorded_by: "Migrasi"
        };
      });

      // Pecah pengiriman data per 100 record agar tidak overload
      for (let i = 0; i < logs.length; i += 100) {
        const chunk = logs.slice(i, i + 100);
        await supabase.from('logs_pelanggaran').insert(chunk);
      }
      console.log("✅ Log Pelanggaran Berhasil");
    }

    console.log("🚀 SEMUA DATA BERHASIL DIPINDAHKAN KE SUPABASE!");
  } catch (err) {
    console.error("Gagal Migrasi:", err.message);
  }
}

migrate();