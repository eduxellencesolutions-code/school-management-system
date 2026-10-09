require('dotenv').config({ path: '../.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const APPLICATION_ID = 'fc53a9ce-e2ba-4af4-81c7-8f83a24d2200'
const TEST_ORG_ID = '4add6397-40d9-444a-accf-ba93a91a9476'
const TEST_REP_ID = '790518ab-a0f3-4686-9b12-545107a04b5c'

async function main() {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'founding50-e2e-superadmin@eduxellence-test.invalid',
    password: 'Founding50SuperAdmin2026!',
  })
  if (signInError) { console.error('Sign-in failed:', signInError); process.exit(1) }
  console.log('Signed in as super-admin\n')

  // ── Step 8c: convert_founding_application ─────────────────────────
  console.log('=== convert_founding_application ===')
  const { data: convertData, error: convertError } = await supabase.rpc(
    'convert_founding_application',
    {
      p_application_id: APPLICATION_ID,
      p_notes: 'E2E test conversion',
    }
  )
  console.log('  data:', JSON.stringify(convertData, null, 2))
  console.log('  error:', JSON.stringify(convertError, null, 2))

  // ── Verify application row ────────────────────────────────────────
  console.log('\n--- Application after convert ---')
  const { data: app } = await supabase
    .from('founding_institution_applications')
    .select('id, status, organization_id, representative_id, updated_at')
    .eq('id', APPLICATION_ID)
    .single()
  console.log(JSON.stringify(app, null, 2))

  // ── Verify processed_payments row ─────────────────────────────────
  console.log('\n--- processed_payments rows for test org ---')
  const { data: payments } = await supabase
    .from('processed_payments')
    .select('*')
    .eq('account_id', TEST_ORG_ID)
    .order('created_at', { ascending: false })
  console.log(JSON.stringify(payments, null, 2))

  // ── Verify commissions row ────────────────────────────────────────
  console.log('\n--- commissions rows for test rep ---')
  const { data: commissions } = await supabase
    .from('commissions')
    .select('*')
    .eq('representative_id', TEST_REP_ID)
    .order('created_at', { ascending: false })
  console.log(JSON.stringify(commissions, null, 2))

  // ── Verify referrals row (should update qualified_at / status) ────
  console.log('\n--- referrals row for test rep ---')
  const { data: referrals } = await supabase
    .from('referrals')
    .select('*')
    .eq('representative_id', TEST_REP_ID)
  console.log(JSON.stringify(referrals, null, 2))
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })