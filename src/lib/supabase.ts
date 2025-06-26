
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = 'https://mxkxkydeluflivpfnyhf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14a3hreWRlbHVmbGl2cGZueWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NTYxMzcsImV4cCI6MjA2NjUzMjEzN30.0PmQrUlrtVMFjqbcr-SUHPJi-y9neLsVXGjwP2kZWW8'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export const isSupabaseConfigured = true
