import React, { useState, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const fmt = (d, o) => new Date(d).toLocaleDateString("id-ID", o);

export default function GrafikPage({ startDate, endDate, setStartDate, setEndDate, fullLogs, isDark }) {
  const [openDetail, setOpenDetail] = useState({});
  const [detailTab, setDetailTab] = useState("santri"); 
  
  const theme = useMemo(() => ({
    text: isDark ? "#e5e7eb" : "#1f2937",
    grid: isDark ? "#374151" : "#e5e7eb",
    bg: isDark ? "#1f2937" : "#ffffff",
    tip: isDark ? "#ffffff" : "#000000"
  }), [isDark]);

  const { chartSantri, chartJenis, detailedLogs } = useMemo(() => {
    const filtered = fullLogs.filter((l) => l.tglMelanggar >= startDate && l.tglMelanggar <= endDate);
    const mapSantri = {}, mapJenis = {}, groupedDetails = {};

    filtered.forEach(l => {
      mapSantri[l.nama] = (mapSantri[l.nama] || 0) + 1;
      (groupedDetails[l.nama] = groupedDetails[l.nama] || []).push(l);
      if (!mapJenis[l.jenis]) mapJenis[l.jenis] = {};
      mapJenis[l.jenis][l.nama] = (mapJenis[l.jenis][l.nama] || 0) + 1;
    });

    const sortedJenis = Object.entries(mapJenis).map(([jenis, v]) => {
      const topEntry = Object.entries(v).sort((a, b) => b[1] - a[1])[0];
      return { jenis, total: Object.values(v).reduce((a, b) => a + b, 0), topName: topEntry?.[0] || "-", topCount: topEntry?.[1] || 0 };
    }).sort((a,b) => b.total - a.total);

    const sortedSantri = Object.entries(mapSantri).map(([nama, total]) => ({ nama, total })).sort((a, b) => b.total - a.total);
    
    return { 
      chartSantri: sortedSantri, 
      chartJenis: sortedJenis, 
      detailedLogs: groupedDetails
    };
  }, [fullLogs, startDate, endDate]);

  const options = useMemo(() => (horiz) => ({
    indexAxis: horiz ? 'y' : 'x', 
    responsive: true, 
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: theme.bg, titleColor: theme.tip, bodyColor: theme.tip, borderColor: theme.grid, borderWidth: 1, padding: 10 } },
    scales: { 
      x: { 
        ticks: { color: theme.text, font: {size: 11, weight: 'bold'} }, 
        grid: { color: theme.grid }
      }, 
      y: { ticks: { color: theme.text, font: {size: 11, weight: 'bold'} }, grid: { display: false } } 
    }
  }), [theme]);

  return (
    <div className="animate-fade-in w-full text-[var(--text-main)] space-y-6">
      <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        <h2 className="font-bold mb-3 text-[var(--text-accent)] text-sm uppercase tracking-wide">Filter Periode</h2>
        <div className="grid grid-cols-2 gap-3">
          {[{ l: "Dari Tanggal", v: startDate, s: setStartDate }, { l: "Sampai Tanggal", v: endDate, s: setEndDate }].map((f, i) => (
            <div key={i}><label className="text-xs font-bold text-[var(--text-muted)] block mb-1">{f.l}</label><input type="date" value={f.v} onChange={e => f.s(e.target.value)} className="w-full p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm outline-none focus:border-blue-500 transition" /><div className="text-xs mt-1 text-right text-[var(--text-muted)]">{fmt(f.v, {dateStyle:"medium"})}</div></div>
          ))}
        </div>
      </div>

      {[
        { title: "Ranking Pelanggaran", data: chartSantri, key: "nama", color: "rgba(59,130,246,0.85)" },
        { title: "Jenis Pelanggaran", data: chartJenis, key: "jenis", color: "rgba(239,68,68,0.85)" }
      ].map((c, idx) => (
        <div key={idx}>
          <h2 className="text-sm font-bold mb-2 text-[var(--text-muted)] uppercase tracking-wider pl-1">{c.title}</h2>
          <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
            <div style={{ height: `${Math.max(300, c.data.length * 40)}px`, width: '100%' }}>
                <Bar 
                    options={options(true)} 
                    data={{ 
                        labels: c.data.map(d => d[c.key]), 
                        datasets: [{ 
                            label: "Jumlah", 
                            data: c.data.map(d => d.total), 
                            backgroundColor: c.color, 
                            borderRadius: 3, 
                            barThickness: 20 
                        }] 
                    }} 
                />
            </div>
          </div>
        </div>
      ))}

      <div>
        <div className="flex justify-between items-end mb-3 pl-1">
           <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Rincian Lengkap</h2>
           <div className="flex bg-[var(--bg-input)] rounded-lg p-1 border border-[var(--border)]">
              <button onClick={() => setDetailTab("santri")} className={`px-3 py-1 text-[10px] font-bold rounded transition ${detailTab==="santri" ? "bg-white text-blue-600 shadow-sm" : "text-[var(--text-muted)]"}`}>👤 Santri</button>
              <button onClick={() => setDetailTab("jenis")} className={`px-3 py-1 text-[10px] font-bold rounded transition ${detailTab==="jenis" ? "bg-white text-blue-600 shadow-sm" : "text-[var(--text-muted)]"}`}>📋 Jenis</button>
           </div>
        </div>

        {detailTab === "santri" && chartSantri.map(s => (
          <div key={s.nama} className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
            <div className="p-3 bg-[var(--bg-header)] cursor-pointer flex justify-between items-center hover:bg-[var(--bg-hover)] transition" onClick={() => setOpenDetail(p => ({ ...p, [s.nama]: !p[s.nama] }))}>
              <span className="font-bold text-[var(--text-accent)] text-sm">{s.nama}</span>
              <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-md text-xs font-bold">{s.total}</span>
            </div>
            {openDetail[s.nama] && <div className="p-3 space-y-2 bg-[var(--bg-sub)] border-t border-[var(--border)]">
              {Object.entries((detailedLogs[s.nama] || []).reduce((a, l) => { (a[l.jenis] = a[l.jenis] || []).push(l); return a; }, {})).sort((a,b)=>b[1].length-a[1].length).map(([j, logs]) => (
                <div key={j} className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border)]">
                  <div className="flex justify-between mb-2 items-center"><span className="text-amber-700 font-bold text-sm w-3/4 leading-snug">{j}</span><span className="text-xs bg-[var(--bg-hover)] px-2 py-0.5 rounded border font-medium">{logs.length}x</span></div>
                  {logs.map((l, i) => <div key={i} className="text-xs text-[var(--text-muted)] mt-1">• {fmt(l.tglMelanggar, {weekday:"long", day:"numeric", month:"short", year:"numeric"})} {l.keterangan && <span className="text-[var(--text-main)] italic"> - "{l.keterangan}"</span>}</div>)}
                </div>
              ))}
            </div>}
          </div>
        ))}

        {detailTab === "jenis" && chartJenis.map(j => (
          <div key={j.jenis} className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
             <div className="p-3 bg-[var(--bg-header)] flex justify-between items-center">
                <div>
                   <div className="font-bold text-[var(--text-accent)] text-sm">{j.jenis}</div>
                   <div className="text-[10px] text-[var(--text-muted)] mt-0.5">👑 Top Pelanggar: <span className="text-amber-600 font-bold">{j.topName} ({j.topCount}x)</span></div>
                </div>
                <span className="bg-red-600 text-white px-2.5 py-0.5 rounded-md text-xs font-bold">{j.total}</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}