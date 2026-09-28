require('dotenv').config({ path: '../.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const CSC101 = 'c3ac22dc-7903-4336-8ced-c5929701bcb4'
const MTH101 = '8873d8e1-772c-4c56-872f-d10746136ee3'
const GST101 = '4239ea35-cdbb-495a-874e-ac070c7aae04'
const ENT101 = '577dae3f-0418-4401-83cd-12376f083eb9'
const LEARNER_ID = '2e90587a-0719-4937-8c07-5ce173fb531f'

async function main() {
  // Sign in as TEST-003
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'test-gamma-real@eduxellence-test.invalid',
    password: 'TestGamma2026!Secure',
  })
  if (signInErr) { console.error('Sign-in failed:', signInErr); process.exit(1) }
  console.log('Signed in as TEST-003\n')

  // ── Attempt 1: 0 electives (compulsory only) ────────────────
  const { data: attempt1, error: e1 } = await supabase.rpc('register_student_courses', {
    p_learner_id: LEARNER_ID,
    p_subject_ids: [CSC101, MTH101],
  })
  console.log('=== Attempt 1 (0 electives, expect blocked) ===')
  console.log(JSON.stringify({ data: attempt1, error: e1 }, null, 2))

  // ── Attempt 2: 2 electives (exceeds choose_count: 1) ────────
  const { data: attempt2, error: e2 } = await supabase.rpc('register_student_courses', {
    p_learner_id: LEARNER_ID,
    p_subject_ids: [CSC101, MTH101, GST101, ENT101],
  })
  console.log('\n=== Attempt 2 (2 electives, expect blocked) ===')
  console.log(JSON.stringify({ data: attempt2, error: e2 }, null, 2))

  // ── Attempt 3: exactly 1 elective (GST101) ──────────────────
  const { data: attempt3, error: e3 } = await supabase.rpc('register_student_courses', {
    p_learner_id: LEARNER_ID,
    p_subject_ids: [CSC101, MTH101, GST101],
  })
  console.log('\n=== Attempt 3 (exactly 1 elective, expect success) ===')
  console.log(JSON.stringify({ data: attempt3, error: e3 }, null, 2))

  // ── Read side after the successful registration ─────────────
  const { data: options } = await supabase.rpc('get_student_registration_options', {
    p_learner_id: LEARNER_ID,
  })
  console.log('\n=== Read side after attempt 3 ===')
  console.log('elective_groups:', JSON.stringify(options?.elective_groups, null, 2))
  console.log('current_registered_units:', options?.current_registered_units)
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })