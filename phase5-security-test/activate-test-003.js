// activate-test-003.js
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const LEARNER_ID = '2e90587a-0719-4937-8c07-5ce173fb531f' // TEST-003
const AUTH_USER_ID = '1f26256b-3059-468b-a8ae-8176f2c7232b' // new auth identity

async function main() {
  const { data, error } = await admin.rpc('complete_learner_activation', {
    p_learner_id: LEARNER_ID,
    p_auth_user_id: AUTH_USER_ID,
  })

  console.log('RPC result:')
  console.log(JSON.stringify({ data, error }, null, 2))

  if (error) process.exit(1)

  // Immediate verification
  const { data: check, error: checkErr } = await admin
    .from('learners')
    .select('id, admission_number, auth_user_id, portal_status, portal_activated_at')
    .eq('id', LEARNER_ID)
    .single()

  console.log('\nLearner after activation:')
  console.log(JSON.stringify(check, null, 2))
  if (checkErr) {
    console.error('Verify error:', checkErr.message)
    process.exit(1)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })