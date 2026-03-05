import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Kita pecah exceljs karena dia yang paling berat
            if (id.includes('exceljs')) {
              return 'vendor-excel';
            }
            // Kita pecah library utama React agar stabil
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-framework';
            }
            // Sisanya (lucide, supabase, dll) masuk ke vendor umum
            return 'vendor';
          }
        }
      }
    }
  }
})