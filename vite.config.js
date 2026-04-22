import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // Pastikan baris ini menggunakan @vitejs/plugin-react

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Meningkatkan batas peringatan ukuran file agar tidak muncul warna kuning (dalam KB)
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Memecah library besar menjadi file terpisah agar aplikasi lebih ringan saat dimuat
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('exceljs')) return 'vendor-excel';
            if (id.includes('jspdf')) return 'vendor-pdf';
            return 'vendor-others';
          }
        }
      }
    }
  }
})