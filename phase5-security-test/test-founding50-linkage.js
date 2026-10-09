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

  // ── Step 6: link_founding_application_referral ────────────────────
  console.log('=== STEP 6: link_founding_application_referral ===')
  const { data: refData, error: refError } = await supabase.rpc(
    'link_founding_application_referral',
    { p_application_id: APPLICATION_ID }
  )
  console.log('  data:', JSON.stringify(refData))
  console.log('  error:', JSON.stringify(refError))

  // Verify: what referrals row exists for our test rep?
  const { data: referrals } = await supabase
    .from('referrals')
    .select('id, representative_id, organization_id, referred_user_id, status, created_at')
    .eq('representative_id', TEST_REP_ID)
    .order('created_at', { ascending: false })
  console.log('  referrals rows for test rep:', JSON.stringify(referrals, null, 2))

  // ── Step 7: link_founding_application_organization ────────────────
  console.log('\n=== STEP 7: link_founding_application_organization ===')
  const { data: orgData, error: orgError } = await supabase.rpc(
    'link_founding_application_organization',
    {
      p_application_id: APPLICATION_ID,
      p_org_id: TEST_ORG_ID,
    }
  )
  console.log('  data:', JSON.stringify(orgData))
  console.log('  error:', JSON.stringify(orgError))

  // Verify: what changed on the application row?
  const { data: afterLink } = await supabase
    .from('founding_institution_applications')
    .select('id, status, representative_id, organization_id, updated_at')
    .eq('id', APPLICATION_ID)
    .single()
  console.log('  application after org link:', JSON.stringify(afterLink, null, 2))

  // Verify: referrals row should now have organization_id populated
  const { data: referralsAfter } = await supabase
    .from('referrals')
    .select('id, representative_id, organization_id, status, updated_at')
    .eq('representative_id', TEST_REP_ID)
    .order('created_at', { ascending: false })
  console.log('  referrals rows after org link:', JSON.stringify(referralsAfter, null, 2))

  // ── Step 7b: duplicate-org guard test ─────────────────────────────
  // Submit a SECOND application with a different institution name, then
  // try to link it to the SAME test org. Should be rejected.
  console.log('\n=== STEP 7b: duplicate-org guard test ===')
  const { data: app2Data, error: app2Error } = await supabase.rpc(
    'submit_founding_institution_application',
    {
      p_campaign_key: 'founding_50_higher_institutions',
      p_institution_name: 'Founding50 E2E Duplicate Attempt',
      p_institution_type: 'university',
      p_contact_name: 'Duplicate Contact',
      p_contact_email: 'founding50-dup@test.invalid',
    }
  )
  console.log('  second application submit:', JSON.stringify(app2Data))
  console.log('  error:', JSON.stringify(app2Error))

  if (app2Data?.application_id) {
    const { data: dupData, error: dupError } = await supabase.rpc(
      'link_founding_application_organization',
      {
        p_application_id: app2Data.application_id,
        p_org_id: TEST_ORG_ID,
      }
    )
    console.log('  duplicate-org link attempt data:', JSON.stringify(dupData))
    console.log('  duplicate-org link attempt error:', JSON.stringify(dupError))
  }
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })