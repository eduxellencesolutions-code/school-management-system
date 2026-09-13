// create-centre-staff.js
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const CENTRE_ORG_ID = 'c0000000-0000-0000-0000-00000000c001'
const PASSWORD = 'TempTest123!'

const USERS = [
  {
    email: 'centre-trainer@test.invalid',
    name: '__PHASE3_TEST_CENTRE_TRAINER__',
  },
  {
    email: 'centre-training-admin@test.invalid',
    name: '__PHASE3_TEST_CENTRE_TRAINING_ADMIN__',
  },
]

async function main() {
  // Clean up if they exist
  const { data: existing } = await admin.auth.admin.listUsers()
  for (const u of USERS) {
    const found = existing?.users?.find(x => x.email === u.email)
    if (found) {
      console.log(`Deleting existing ${u.email} (${found.id})...`)
      await admin.auth.admin.deleteUser(found.id)
    }
  }

  // Create fresh
  const results = []
  for (const u of USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: u.name },
    })
    if (error) {
      console.error(`createUser failed for ${u.email}:`, error)
      process.exit(1)
    }
    results.push({ email: u.email, id: data.user.id, name: u.name })
    console.log(`✅ Created ${u.email} → ${data.user.id}`)
  }

  console.log()
  console.log('=== Copy these ids into the next SQL step ===')
  for (const r of results) {
    console.log(`${r.email}  →  ${r.id}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })