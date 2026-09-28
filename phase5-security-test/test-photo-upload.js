// test-photo-upload.js
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

const ORG_ID = 'a3bde471-3bac-47a7-a7e7-b7fa24d2cffb'
const LEARNER_ID = '2e90587a-0719-4937-8c07-5ce173fb531f' // TEST-003

const STUDENT_EMAIL = 'test-gamma-real@eduxellence-test.invalid'
const STUDENT_PASSWORD = 'TestGamma2026!Secure'

const PHOTO_PATH = `${ORG_ID}/${LEARNER_ID}/photo.png`

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: STUDENT_EMAIL,
    password: STUDENT_PASSWORD,
  })
  if (signInError) {
    console.error('Sign-in failed:', signInError)
    process.exit(1)
  }
  console.log('Signed in as TEST-003\n')

  // === TEST A (retry): call submit_onboarding_photo only ===
  // The file already landed in storage on the first attempt, so no re-upload.
  console.log('=== TEST A (retry): submit_onboarding_photo RPC ===')
  console.log('Using existing path:', PHOTO_PATH)

  const { data: photoResult, error: photoError } = await supabase.rpc('submit_onboarding_photo', {
    p_learner_id: LEARNER_ID,
    p_storage_path: PHOTO_PATH,
  })
  console.log('Retry:')
  console.log(JSON.stringify({ data: photoResult, error: photoError }, null, 2))

  // === Final state check ===
  console.log('\n=== Final learners.photo_url ===')
  const { data: learner } = await supabase
    .from('learners')
    .select('id, photo_url')
    .eq('id', LEARNER_ID)
    .single()
  console.log(JSON.stringify(learner, null, 2))
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})