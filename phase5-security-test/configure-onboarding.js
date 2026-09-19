// configure-onboarding.js
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

async function main() {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: 'eli@eduxellence.org',
    password: process.env.ADMIN_TEST_PASSWORD
  })
  if (signInError) { console.error('Sign-in failed:', signInError); process.exit(1) }

  const { data, error } = await supabase.rpc('configure_onboarding_requirements', {
    p_requirements: [
      { step_key: 'identity_confirmation', label: 'Confirm Identity', is_mandatory: true, sort_order: 1 },
      { step_key: 'personal_info', label: 'Personal Information', is_mandatory: true, sort_order: 2 },
      { step_key: 'next_of_kin', label: 'Next of Kin', is_mandatory: true, sort_order: 3 },
      { step_key: 'photo_document', label: 'Photo', is_mandatory: false, sort_order: 4 },
      { step_key: 'review_confirmation', label: 'Review & Confirm', is_mandatory: true, sort_order: 5 }
    ]
  })

  console.log(JSON.stringify({ data, error }, null, 2))
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })