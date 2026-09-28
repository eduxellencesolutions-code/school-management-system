require('dotenv').config({ path: '../.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const GST_ID = '4239ea35-cdbb-495a-874e-ac070c7aae04'
const ENT_ID = '577dae3f-0418-4401-83cd-12376f083eb9'
const CURRICULUM_ID = 'b23f006b-2cb1-478f-9dce-e453e3b750d4'
const LEARNER_ID = '2e90587a-0719-4937-8c07-5ce173fb531f'

async function main() {
  // ── sign in as admin ────────────────────────────────────────
  const { error: adminErr } = await supabase.auth.signInWithPassword({
    email: 'eli@eduxellence.org',
    password: process.env.EDUX_ADMIN_PASSWORD,
  })
  if (adminErr) { console.error('Admin sign-in failed:', adminErr); process.exit(1) }
  console.log('Signed in as admin\n')

  // ── assign both subjects to the curriculum ─────────────────
  const a1 = await supabase.rpc('assign_subject_to_curriculum', { p_subject_id: GST_ID, p_curriculum_id: CURRICULUM_ID })
  console.log('assign GST101:', JSON.stringify({ data: a1.data, error: a1.error }))

  const a2 = await supabase.rpc('assign_subject_to_curriculum', { p_subject_id: ENT_ID, p_curriculum_id: CURRICULUM_ID })
  console.log('assign ENT101:', JSON.stringify({ data: a2.data, error: a2.error }))

  // ── create the elective group ──────────────────────────────
  const { data: group, error } = await supabase.rpc('create_elective_group', {
    p_curriculum_id: CURRICULUM_ID,
    p_name: 'General Elective Group A',
    p_choose_count: 1,
    p_choose_credit_units: null,
    p_subject_ids: [GST_ID, ENT_ID],
  })
  console.log('\nElective group:', JSON.stringify({ data: group, error }, null, 2))

  // ── sign out, sign in as TEST-003 ──────────────────────────
  await supabase.auth.signOut()
  const { error: stuErr } = await supabase.auth.signInWithPassword({
    email: 'test-gamma-real@eduxellence-test.invalid',
    password: 'TestGamma2026!Secure',
  })
  if (stuErr) { console.error('Student sign-in failed:', stuErr); process.exit(1) }
  console.log('\nSigned in as TEST-003\n')

  // ── read-side check ────────────────────────────────────────
  const { data: options, error: optErr } = await supabase.rpc('get_student_registration_options', {
    p_learner_id: LEARNER_ID,
  })
  console.log('Registration options:', JSON.stringify({ data: options, error: optErr }, null, 2))
  console.log('\nelective_groups specifically:')
  console.log(JSON.stringify(options?.elective_groups, null, 2))
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })