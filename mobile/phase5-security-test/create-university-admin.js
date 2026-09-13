// create-university-admin.js
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const EMAIL = 'university-test-admin@test.invalid'
const PASSWORD = 'TempTest123!'

async function main() {
  // Delete if exists
  const { data: existing } = await admin.auth.admin.listUsers()
  const found = existing?.users?.find(u => u.email === EMAIL)
  if (found) {
    console.log(`Deleting existing ${EMAIL} (${found.id})...`)
    await admin.auth.admin.deleteUser(found.id)
  }

  // Create fresh
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: '__PHASE3_TEST_UNIVERSITY_ADMIN__' },
  })

  if (error) {
    console.error('createUser failed:', error)
    process.exit(1)
  }

  console.log()
  console.log('✅ Auth user created')
  console.log('   id:    ', data.user.id)
  console.log('   email: ', data.user.email)
}

main().catch((e) => { console.error(e); process.exit(1) })