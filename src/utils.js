import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const SUPER_ADMINS = ["daruttauhidpotroyudan@gmail.com", "ma2n13@gmail.com"];
export const ROLES = { ADMIN: 'admin', PENTAKZIR: 'pentakzir', PETUGAS: 'petugas_absen', WALI_KELAS: 'wali_kelas' };
export const BASE_URL = window.location.origin;

export const getUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const getDate = (d = new Date()) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
export const fmtDate = (d) => new Date(d).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "short", day: "numeric" });
export const fmtTimeAgo = (dateString) => {
    if (!dateString) return "Belum pernah aktif";
    const d = new Date(dateString);
    return d.toLocaleString("id-ID", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};
export const formatWA = (no) => {
    if (!no) return "";
    let formatted = String(no).replace(/\D/g, '');
    if (formatted.startsWith('0')) formatted = '62' + formatted.substring(1);
    return formatted;
};

export const generateExcel = async (nama, logs, types, currentDate = new Date()) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Riwayat Pelanggaran');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStr = currentDate.toLocaleString('id-ID', { month: 'long' });
    
    sheet.columns = [{ key: 'jenis', width: 35 }, ...Array.from({ length: daysInMonth }, (_, i) => ({ key: `d${i + 1}`, width: 5 }))];
    sheet.mergeCells(1, 1, 1, daysInMonth + 1);
    const titleRow = sheet.getCell(1, 1);
    titleRow.value = `${nama} | ${monthStr} ${year}`;
    titleRow.font = { bold: true, size: 14 };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    const headerValues = ['Jenis Pelanggaran', ...Array.from({ length: daysInMonth }, (_, i) => {
        const dayName = ["Ahd", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][new Date(year, month, i + 1).getDay()];
        return `${i + 1}\n${dayName}`;
    })];

    const headerRow = sheet.getRow(2);
    headerRow.values = headerValues;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    sheet.getRow(2).height = 35; 

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

export const generatePDF = (nama, logs, types, currentDate = new Date()) => {
    try {
        const doc = new jsPDF('landscape');
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthStr = currentDate.toLocaleString('id-ID', { month: 'long' });

        doc.setFontSize(16);
        doc.text(`Riwayat Absensi: ${nama}`, 14, 15);
        doc.setFontSize(11);
        doc.text(`Bulan: ${monthStr} ${year}`, 14, 22);

        const head = [['Jenis Kegiatan', ...Array.from({ length: daysInMonth }, (_, i) => {
            const dayName = ["Ahd", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][new Date(year, month, i + 1).getDay()];
            return `${i + 1}\n${dayName}`;
        })]];
        
        const body = [];
        const currentMonthLogs = logs.filter(l => { const d = new Date(l.tglMelanggar); return d.getMonth() === month && d.getFullYear() === year; });
        
        types.forEach(type => {
            const row = [type.nama];
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                if (currentMonthLogs.some(l => l.jenis === type.nama && l.tglMelanggar === dateStr)) {
                    row.push('X');
                } else {
                    row.push('');
                }
            }
            body.push(row);
        });

        autoTable(doc, {
            head: head,
            body: body,
            startY: 28,
            styles: { fontSize: 7, halign: 'center', valign: 'middle', cellPadding: 0.8, lineColor: [200, 200, 200], lineWidth: 0.1 },
            columnStyles: { 0: { halign: 'left', cellWidth: 38, fontStyle: 'bold', cellPadding: 1.5 } },
            headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontSize: 6, minCellHeight: 10 },
            willDrawCell: function (data) {
                if (data.section === 'body' && data.column.index > 0 && data.cell.raw === 'X') {
                    doc.setFillColor(220, 38, 38);
                    doc.setTextColor(255, 255, 255);
                }
            }
        });

        doc.save(`Riwayat_${nama}_${monthStr}_${year}.pdf`);
    } catch (err) {
        console.error("Error PDF:", err);
        alert("Gagal membuat PDF. Pastikan jspdf dan jspdf-autotable terinstall dengan benar.");
    }
};