import { createClient } from '@supabase/supabase-js'

// SERVER-ONLY. Never import this in a client component or expose SUPABASE_SERVICE_ROLE_KEY
// to the browser. Used only for admin operations: creating parent auth identities and
// generating sign-in links.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no O/0/I/1 ambiguity
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}
