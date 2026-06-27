import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      `Missing Supabase env vars. URL: ${url ? 'set' : 'MISSING'}, KEY: ${key ? 'set' : 'MISSING'}`
    )
  }

  // ✅ Pass options as a single object to fix deprecated warning
  return createBrowserClient(url, key, {
    auth: {
      flowType: 'pkce',
    },
  })
}