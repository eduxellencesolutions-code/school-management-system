// create-tertiary-test-admin.js — service role required
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  const { data, error } = await admin.auth.admin.createUser({
    email: 'tertiary-billing-test-admin@eduxellence-test.invalid',
    password: 'TertiaryBillingTest2026!',
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      organization_id: '1efe6481-7a32-413b-b998-5e97c685802a',
      name: 'Tertiary Billing Test Admin'
    }
  })
  console.log(JSON.stringify({ data: data?.user ? { id: data.user.id, email: data.user.email } : null, error }, null, 2))
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })