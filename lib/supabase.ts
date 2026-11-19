import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://gshppxgvdrmbfcxsxeph.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaHBweGd2ZHJtYmZjeHN4ZXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMjQzODAsImV4cCI6MjEwNzYwMDM4MH0.lhpLOeb7oY0e-ZCIgSBgzHfPAgAzK8eqFgUPg9te8XM'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

export const supabaseServer = createClient(supabaseUrl, supabaseKey)
