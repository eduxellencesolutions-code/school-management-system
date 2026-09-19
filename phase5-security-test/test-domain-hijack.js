// test-domain-hijack.js
// Verifies that the RLS policy on organization_domains prevents a caller
// from inserting a domain row owned by a DIFFERENT org than their own.
require('dotenv').config({ path: '../.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing env vars. Ensure ../.env.local contains:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL')
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Caller — admin of Org A
const ADMIN_EMAIL = 'eli@eduxellence.org'
const ADMIN_PASSWORD = process.env.EDUX_ADMIN_PASSWORD || '<ADMIN_PASSWORD_HERE>'

// Target — Org B (a DIFFERENT org than the caller's own)
const OTHER_ORG_ID = '63b79d0a-4af0-4a31-a19a-63f3f3aa64a7'

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 1. Sign in as the Org A admin
  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })
  console.log('=== Sign-in ===')
  console.log(JSON.stringify({ userId: signIn?.user?.id, error: signInError }, null, 2))
  if (signInError) return

  // 2. Attempt a raw INSERT claiming Org B as the owner
  const { data, error } = await supabase
    .from('organization_domains')
    .insert({
      organization_id: OTHER_ORG_ID,
      hostname: 'attempted-hijack.eduxellence.org',
      domain_type: 'eduxellence_subdomain',
    })
    .select()

  console.log('\n=== Cross-org raw insert attempt ===')
  console.log(JSON.stringify({ data, error }, null, 2))
}

main().catch((e) => {
  console.error('\nFATAL:', e.message)
  process.exit(1)
})