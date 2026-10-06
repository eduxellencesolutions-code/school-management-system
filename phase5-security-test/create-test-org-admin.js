require('dotenv').config({ path: '../.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  const { data, error } = await admin.auth.admin.createUser({
    email: 'test-org-admin@eduxellence-test.invalid',
    password: 'TestOrgAdmin2026!',
    email_confirm: true,
    user_metadata: {
      name: 'Test Org Admin',
      // NOTE: deliberately NOT setting role: 'admin' — that triggers
      // handle_new_user's admin branch, which tries to create a new org
      // and enqueue a signup notification. The latter fails and rolls back
      // the whole user creation (the bug we just confirmed). Set role via
      // UPDATE in the setup SQL instead.
      role: 'teacher',
    },
  })
  console.log(JSON.stringify({
    id: data?.user?.id,
    email: data?.user?.email,
    error: error?.message,
  }, null, 2))
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })