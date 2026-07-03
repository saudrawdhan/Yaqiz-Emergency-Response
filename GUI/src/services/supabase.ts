import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// DEBUG — remove after diagnosing loading issue
console.log('[supabase.ts] VITE_SUPABASE_URL present:', !!supabaseUrl)
console.log('[supabase.ts] VITE_SUPABASE_ANON_KEY present:', !!supabaseAnonKey)
console.log('[supabase.ts] URL value:', supabaseUrl ?? 'MISSING')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase.ts] ❌ Missing env vars — Supabase client NOT created')
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

console.log('[supabase.ts] ✅ Creating Supabase client...')
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
console.log('[supabase.ts] ✅ Supabase client created')
