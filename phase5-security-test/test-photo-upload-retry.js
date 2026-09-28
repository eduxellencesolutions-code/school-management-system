require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

async function main() {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'test-gamma-real@eduxellence-test.invalid',
    password: 'TestGamma2026!Secure'
  })
  if (signInError) { console.error('Sign-in failed:', signInError); process.exit(1) }

  const { data: photoResult, error: photoError } = await supabase.rpc('submit_onboarding_photo', {
    p_learner_id: '2e90587a-0719-4937-8c07-5ce173fb531f',
    p_storage_path: 'a3bde471-3bac-47a7-a7e7-b7fa24d2cffb/2e90587a-0719-4937-8c07-5ce173fb531f/photo.png'
  })
  console.log('Retry:', JSON.stringify({ data: photoResult, error: photoError }, null, 2))
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })