import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // ✅ Add this guard to catch missing env vars
  if (!url || !key) {
    throw new Error(
      `Missing Supabase env vars. URL: ${url ? 'set' : 'MISSING'}, KEY: ${key ? 'set' : 'MISSING'}`
    )
  }

  return createBrowserClient(url, key)
}