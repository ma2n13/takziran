import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://mqhszwgdnezdaonwhopb.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHN6d2dkbmV6ZGFvbndob3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTEzODMsImV4cCI6MjA4NDM2NzM4M30.PezVTA-hIaK88uCDdeWwp49C7Cg44crz3UpGToxtNeU"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)