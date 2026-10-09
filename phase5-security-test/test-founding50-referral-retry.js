require('dotenv').config({ path: '../.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const APPLICATION_ID = 'fc53a9ce-e2ba-4af4-81c7-8f83a24d2200'
const TEST_REP_ID = '790518ab-a0f3-4686-9b12-545107a04b5c'

async function main() {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'founding50-e2e-superadmin@eduxellence-test.invalid',
    password: 'Founding50SuperAdmin2026!',
  })
  if (signInError) { console.error('Sign-in failed:', signInError); process.exit(1) }
  console.log('Signed in as super-admin\n')

  console.log('=== STEP 6 retry: link_founding_application_referral ===')
  const { data: refData, error: refError } = await supabase.rpc(
    'link_founding_application_referral',
    { p_application_id: APPLICATION_ID }
  )
  console.log('  data:', JSON.stringify(refData))
  console.log('  error:', JSON.stringify(refError))

  const { data: referrals } = await supabase
    .from('referrals')
    .select('id, representative_id, organization_id, referred_user_id, status, created_at')
    .eq('representative_id', TEST_REP_ID)
    .order('created_at', { ascending: false })
  console.log('  referrals rows for test rep:', JSON.stringify(referrals, null, 2))
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })