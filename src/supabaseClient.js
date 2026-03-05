// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,    // Menyimpan sesi secara permanen di browser (localStorage)
    autoRefreshToken: true,  // Memperbarui token otomatis agar sesi tidak kadaluarsa
    detectSessionInUrl: true // Mendeteksi sesi jika kembali dari login eksternal (Google/Email)
  }
})