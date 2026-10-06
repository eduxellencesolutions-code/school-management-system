// create-tertiary-test-admin.js — corrected
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  const { data, error } = await admin.auth.admin.createUser({
    email: 'tertiary-billing-test-admin@eduxellence-test.invalid',
    password: 'TertiaryBillingTest2026!',
    email_confirm: true,
    user_metadata: {
      role: 'teacher', // avoid the admin-branch's auto org-creation
      organization_id: '1efe6481-7a32-413b-b998-5e97c685802a',
      name: 'Tertiary Billing Test Admin'
    }
  })
  if (error) { console.error('createUser failed:', error); process.exit(1) }
  console.log('Created:', data.user.id)

  const { error: promoteError } = await admin
    .from('users')
    .update({ role: 'admin' })
    .eq('id', data.user.id)

  console.log('Promote to admin:', JSON.stringify({ error: promoteError }, null, 2))
  console.log('\nFinal user id to use for sign-in:', data.user.id)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })