// send-reminders-positive-test.js
// Confirms the positive case: TEST-002 (not_started) matches all_incomplete and gets a reminder.
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

const ADMIN_EMAIL = 'eli@eduxellence.org'
const ADMIN_PASSWORD = process.env.EDUX_ADMIN_PASSWORD || '<ADMIN_PASSWORD_HERE>'

const TEST002_LEARNER_ID = 'a7da453a-294f-457d-8e8b-3819c1e27c03'
const DEPARTMENT_ID = '0f29032a-c9db-45a2-a2bf-47d50105a33d'
const PROGRAMME_ID = '5b888dc0-c5dc-4ebc-8580-1e9c95443f61'
const LEVEL = '100'

function log(label, payload) {
  console.log('\n=== ' + label + ' ===')
  console.log(JSON.stringify(payload, null, 2))
}

async function makeClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function signIn(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error('Sign-in failed for ' + email + ': ' + error.message)
  return data.user
}

async function main() {
  const client = await makeClient()
  await signIn(client, ADMIN_EMAIL, ADMIN_PASSWORD)

  // Check 1 — TEST-002's onboarding status, expecting not_started
  const { data: statusCheck, error: statusError } = await client.rpc('get_student_onboarding_status', {
    p_learner_id: TEST002_LEARNER_ID,
  })
  log('CHECK 1 — get_student_onboarding_status for TEST-002 (expect not_started)', {
    data: statusCheck,
    error: statusError,
  })

  // Check 2 — send reminders, expecting sent_count: 1 (TEST-002 matches all_incomplete)
  const { data: reminders, error: remindersError } = await client.rpc('send_onboarding_reminders', {
    p_department_id: DEPARTMENT_ID,
    p_programme_id: PROGRAMME_ID,
    p_level: LEVEL,
    p_filter_type: 'all_incomplete',
  })
  log('CHECK 2 — send_onboarding_reminders (expect sent_count: 1)', {
    data: reminders,
    error: remindersError,
  })
}

main().catch((e) => {
  console.error('\nFATAL:', e.message)
  process.exit(1)
})