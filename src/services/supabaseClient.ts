import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(
  supabaseUrl?.trim() && supabaseAnonKey?.trim(),
)

export const supabase: SupabaseClient | null =
  isSupabaseConfigured && supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export const supabaseConfigMessage =
  'Missing Supabase environment variables. Copy video-qa/.env.example to video-qa/.env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(supabaseConfigMessage)
  }
  return supabase
}
