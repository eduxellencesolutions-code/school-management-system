// send-reminders-test.js
// Re-runs steps 1–3 from the previous test, then exercises send_onboarding_reminders
// for all_incomplete scope, expecting 0 reminders sent (TEST-003 is completed).
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

// ─── Credentials ──────────────────────────────────────────────────────
const ADMIN_EMAIL = 'eli@eduxellence.org'
const ADMIN_PASSWORD = process.env.EDUX_ADMIN_PASSWORD || '<ADMIN_PASSWORD_HERE>'

const STUDENT_EMAIL = 'test-gamma-real@eduxellence-test.invalid'
const STUDENT_PASSWORD = 'TestGamma2026!Secure'

// ─── Targets ──────────────────────────────────────────────────────────
const LEARNER_ID = '2e90587a-0719-4937-8c07-5ce173fb531f'
const DEPARTMENT_ID = '0f29032a-c9db-45a2-a2bf-47d50105a33d'
const PROGRAMME_ID = '5b888dc0-c5dc-4ebc-8580-1e9c95443f61'
const LEVEL = '100'
const SESSION_ID = null
const DEADLINE_AT = '2026-10-30T23:59:00Z'

// ─── Helpers ──────────────────────────────────────────────────────────
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

// ─── Steps ────────────────────────────────────────────────────────────
async function step1_setDeadline() {
  const client = await makeClient()
  await signIn(client, ADMIN_EMAIL, ADMIN_PASSWORD)

  const { data, error } = await client.rpc('set_onboarding_deadline', {
    p_department_id: DEPARTMENT_ID,
    p_programme_id: PROGRAMME_ID,
    p_level: LEVEL,
    p_session_id: SESSION_ID,
    p_deadline_at: DEADLINE_AT,
    p_extension_reason: null,
  })
  log('STEP 1 — set_onboarding_deadline (as admin)', { data, error })
}

async function step2_studentStatus() {
  const client = await makeClient()
  await signIn(client, STUDENT_EMAIL, STUDENT_PASSWORD)

  const { data, error } = await client.rpc('get_student_onboarding_status', {
    p_learner_id: LEARNER_ID,
  })
  log('STEP 2 — get_student_onboarding_status (as student)', { data, error })
}

async function step3_adminMonitor() {
  const client = await makeClient()
  await signIn(client, ADMIN_EMAIL, ADMIN_PASSWORD)

  const { data, error } = await client.rpc('get_onboarding_monitor', {
    p_department_id: DEPARTMENT_ID,
    p_programme_id: PROGRAMME_ID,
    p_level: LEVEL,
    p_session_id: SESSION_ID,
  })
  log('STEP 3 — get_onboarding_monitor (as admin)', { data, error })
}

async function step4_sendReminders() {
  const client = await makeClient()
  await signIn(client, ADMIN_EMAIL, ADMIN_PASSWORD)

  const { data, error } = await client.rpc('send_onboarding_reminders', {
    p_department_id: DEPARTMENT_ID,
    p_programme_id: PROGRAMME_ID,
    p_level: LEVEL,
    p_filter_type: 'all_incomplete',
  })
  log('STEP 4 — send_onboarding_reminders (all_incomplete, expect 0)', { data, error })
}

// ─── Main ─────────────────────────────────────────────────────────────
async function main() {
  await step1_setDeadline()
  await step2_studentStatus()
  await step3_adminMonitor()
  await step4_sendReminders()
}

main().catch((e) => {
  console.error('\nFATAL:', e.message)
  process.exit(1)
})