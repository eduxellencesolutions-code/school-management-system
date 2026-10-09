require('dotenv').config({ path: '../.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const APPLICATION_ID = 'fc53a9ce-e2ba-4af4-81c7-8f83a24d2200'

async function main() {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'founding50-e2e-superadmin@eduxellence-test.invalid',
    password: 'Founding50SuperAdmin2026!',
  })
  if (signInError) { console.error('Sign-in failed:', signInError); process.exit(1) }
  console.log('Signed in as super-admin\n')

  console.log('=== Double convert attempt (should fail) ===')
  const { data, error } = await supabase.rpc('convert_founding_application', {
    p_application_id: APPLICATION_ID,
    p_notes: 'Second convert attempt — should fail',
  })
  console.log('  data:', JSON.stringify(data, null, 2))
  console.log('  error:', JSON.stringify(error, null, 2))

  if (error) {
    console.log('\n✅ GUARD WORKS — convert rejected the second call')
  } else {
    console.log('\n❌ FINDING — convert allowed a second call on an already-converted application')
  }
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })