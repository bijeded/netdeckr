import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loud in development; the app is read-only and cannot work without these.
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in .env.local.',
  )
}

// Browser client: read-only public data, protected by RLS. Never use a service-role key here.
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
