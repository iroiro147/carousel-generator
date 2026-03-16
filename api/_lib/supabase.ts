// ─── Server-Side Supabase Client ─────────────────────────────────────────────
// Uses SUPABASE_SERVICE_ROLE_KEY for server-side operations.
// Completely separate from the frontend client in app/src/lib/supabase.ts
// which uses the anon key (Architecture Decision #7).

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getServerSupabase(): SupabaseClient | null {
  if (client) return client

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.warn('[supabase] Server-side Supabase not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
    return null
  }

  client = createClient(url, key)
  return client
}

export function isServerSupabaseAvailable(): boolean {
  return !!(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
