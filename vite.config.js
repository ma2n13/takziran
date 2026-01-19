import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 1. Naikkan batas peringatan chunk (misal jadi 1000 kB / 1 MB) agar warning hilang
    chunkSizeWarningLimit: 1000,
    
    // 2. Konfigurasi Rollup untuk memecah kode (Code Splitting)
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Pisahkan semua library di node_modules ke file 'vendor.js' terpisah
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          // OPSI ALTERNATIF (Lebih terpecah):
          // Jika ingin memisahkan library berat secara spesifik:
          /*
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'chart';
            return 'vendor'; // sisanya (react, dll)
          }
          */
        }
      }
    }
  }
})