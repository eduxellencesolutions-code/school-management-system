require('dotenv').config({ path: '../.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const APPLICATION_ID = 'fc53a9ce-e2ba-4af4-81c7-8f83a24d2200'

async function main() {
  // ── Sign in as the super-admin ─────────────────────────────────────
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'founding50-e2e-superadmin@eduxellence-test.invalid',
    password: 'Founding50SuperAdmin2026!',
  })
  if (signInError) {
    console.error('Sign-in failed:', signInError)
    process.exit(1)
  }
  console.log('Signed in as super-admin\n')

  // ── Confirm is_super_admin returns true ────────────────────────────
  const { data: isSuper, error: superError } = await supabase.rpc('is_super_admin')
  console.log('is_super_admin():', isSuper, superError ? `(error: ${superError.message})` : '')

  // ── Step 4: start_founding_application_review ─────────────────────
  console.log('\n=== STEP 4: start_founding_application_review ===')
  const { data: startData, error: startError } = await supabase.rpc(
    'start_founding_application_review',
    { p_application_id: APPLICATION_ID }
  )
  console.log('  data:', JSON.stringify(startData))
  console.log('  error:', JSON.stringify(startError))

  // ── Verify status after start_review ──────────────────────────────
  const { data: afterStart } = await supabase
    .from('founding_institution_applications')
    .select('id, status, status_reason, updated_at')
    .eq('id', APPLICATION_ID)
    .single()
  console.log('  status after start_review:', JSON.stringify(afterStart))

  // ── Step 5: qualify_founding_application ──────────────────────────
  console.log('\n=== STEP 5: qualify_founding_application ===')
  const { data: qualData, error: qualError } = await supabase.rpc(
    'qualify_founding_application',
    {
      p_application_id: APPLICATION_ID,
      p_reason: 'E2E test qualification',
    }
  )
  console.log('  data:', JSON.stringify(qualData, null, 2))
  console.log('  error:', JSON.stringify(qualError))

  // ── Verify status after qualify ───────────────────────────────────
  const { data: afterQual } = await supabase
    .from('founding_institution_applications')
    .select('id, status, status_reason, updated_at')
    .eq('id', APPLICATION_ID)
    .single()
  console.log('  status after qualify:', JSON.stringify(afterQual))
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })