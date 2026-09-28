// test-activation-slips.js
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

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })
  if (signInError) {
    console.error('Sign-in failed:', signInError)
    process.exit(1)
  }

  const { data: results, error } = await supabase.rpc('bulk_generate_activation_tokens', {
    p_group_id: 'ee9e3b0b-a421-436d-8780-b17461961d26',
    p_expires_in_hours: 168,
  })
  if (error) {
    console.error('bulk_generate_activation_tokens failed:', error)
    process.exit(1)
  }

  console.log('Raw results:')
  console.log(JSON.stringify(results, null, 2))

  const generated = results.filter((r) => r.token !== null)
  const skipped = results.filter((r) => r.token === null)

  console.log(`\nGenerated: ${generated.length}, Skipped: ${skipped.length}`)

  // Fetch org branding, same as the real page would
  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url')
    .eq('id', 'a3bde471-3bac-47a7-a7e7-b7fa24d2cffb')
    .single()

  // Fetch the learners the generated tokens belong to
  const generatedIds = generated.map((r) => r.learner_id)
  const { data: learners } = generatedIds.length
    ? await supabase
        .from('learners')
        .select('id, first_name, last_name, admission_number')
        .in('id', generatedIds)
    : { data: [] }

  const slipData = generated.map((r) => {
    const l = learners.find((x) => x.id === r.learner_id)
    return {
      admission_number: l?.admission_number,
      name: `${l?.last_name} ${l?.first_name}`,
      token: r.token,
      expires_at: r.expires_at,
    }
  })

  console.log('\nFinal slip data (what the PDF component would receive):')
  console.log(JSON.stringify({ institution: org, students: slipData }, null, 2))
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})