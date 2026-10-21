import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Key is missing in Server Environment')
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
