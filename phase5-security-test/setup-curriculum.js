// setup-curriculum.js — signs in as a real Elibas admin, then calls the
// admin-only RPCs with proper auth.uid() context.
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = 'eli@eduxellence.org'
const PROGRAMME_ID = '5b888dc0-c5dc-4ebc-8580-1e9c95443f61'
const LEVEL = '100'
const VERSION_YEAR = 2026
const CSC101_ID = 'c3ac22dc-7903-4336-8ced-c5929701bcb4'
const MTH101_ID = '8873d8e1-772c-4c56-872f-d10746136ee3'

async function main() {
  // 1. Sign in as a real admin
  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: process.env.ADMIN_TEST_PASSWORD,
  })
  if (signInError) {
    console.error('Admin sign-in failed:', signInError)
    process.exit(1)
  }
  console.log('Signed in as admin:', signIn.user?.email)

  // 2. Check if a curriculum already exists for this programme/level/year
  const { data: existing, error: existingErr } = await supabase
    .from('curricula')
    .select('id')
    .eq('programme_id', PROGRAMME_ID)
    .eq('level', LEVEL)
    .eq('version_year', VERSION_YEAR)
    .maybeSingle()

  if (existingErr) {
    console.error('Lookup failed:', existingErr)
    process.exit(1)
  }

  let curriculumId
  if (existing) {
    curriculumId = existing.id
    console.log('Reusing existing curriculum:', curriculumId)
  } else {
    const { data: created, error: createErr } = await supabase.rpc('create_curriculum', {
      p_programme_id: PROGRAMME_ID,
      p_level: LEVEL,
      p_version_year: VERSION_YEAR,
    })
    if (createErr) {
      console.error('create_curriculum failed:', createErr)
      process.exit(1)
    }
    console.log('Created curriculum:', JSON.stringify(created, null, 2))
    curriculumId = created?.id ?? created
  }

  // 3. Assign both subjects to the curriculum
  for (const subjectId of [CSC101_ID, MTH101_ID]) {
    const { error: assignErr } = await supabase.rpc('assign_subject_to_curriculum', {
      p_subject_id: subjectId,
      p_curriculum_id: curriculumId,
    })
    if (assignErr) {
      console.error(`assign_subject_to_curriculum(${subjectId}) failed:`, assignErr)
      process.exit(1)
    }
    console.log('Assigned subject:', subjectId)
  }

  // 4. Verify both subjects now have the curriculum_id populated
  const { data: check } = await supabase
    .from('subjects')
    .select('id, name, code, curriculum_id, course_type')
    .in('id', [CSC101_ID, MTH101_ID])

  console.log('\nFinal state of both subjects:')
  console.log(JSON.stringify(check, null, 2))
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })