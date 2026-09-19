// create-test-gamma-user.js
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const EMAIL = 'test-gamma-real@eduxellence-test.invalid'
const PASSWORD = 'TestGamma2026!Secure'

async function main() {
  // Delete any prior account with this email, so re-runs are idempotent
  const { data: list } = await admin.auth.admin.listUsers()
  const existing = list?.users?.find(u => u.email === EMAIL)
  if (existing) {
    console.log(`Deleting existing ${EMAIL} (${existing.id})...`)
    await admin.auth.admin.deleteUser(existing.id)
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  })

  if (error) {
    console.error('createUser failed:', error)
    process.exit(1)
  }

  console.log()
  console.log('✅ Auth user created')
  console.log('   id:    ', data.user.id)
  console.log('   email: ', data.user.email)
  console.log()
  console.log('   password:', PASSWORD)
  console.log()
  console.log('>>> Copy the id above — used in the next step')
}

main().catch((e) => { console.error(e); process.exit(1) })