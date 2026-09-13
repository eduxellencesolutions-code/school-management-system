// create-test-user.js
// Creates a test centre admin via the Supabase Admin API — the only
// reliable way to produce an auth.users row GoTrue will accept for login.
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TEST_EMAIL = 'centre-test-admin@test.invalid'
const TEST_PASSWORD = 'TempTest123!'

async function main() {
  // 1. If the broken row is still there, remove it first via admin API
  //    (this also cleans up identities + refresh tokens properly)
  const { data: existing } = await admin.auth.admin.listUsers()
  const broken = existing?.users?.find(u => u.email === TEST_EMAIL)

  if (broken) {
    console.log(`Found existing user ${broken.id}, deleting first...`)
    const { error: delErr } = await admin.auth.admin.deleteUser(broken.id)
    if (delErr) {
      console.error('deleteUser failed:', delErr)
      process.exit(1)
    }
    console.log('Deleted.')
  }

  // 2. Create fresh
  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { name: '__PHASE3_TEST_CENTRE_ADMIN__' },
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
  console.log('>>> Copy the id above. You will paste it into the next SQL step')
  console.log('    to mirror this user into public.users.')
}

main().catch((e) => { console.error(e); process.exit(1) })