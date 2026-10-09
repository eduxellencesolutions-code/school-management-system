require('dotenv').config({ path: '../.env.local' })
const { createClient } = require('@supabase/supabase-js')

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

async function main() {
  const { data, error } = await admin.auth.admin.createUser({
    email: 'founding50-e2e-superadmin@eduxellence-test.invalid',
    password: 'Founding50SuperAdmin2026!',
    email_confirm: true,
    user_metadata: {
      name: 'Founding50 E2E Super Admin',
      account_type: 'staff',
      role: 'teacher',   // avoid the trigger's admin branch
    },
  })
  console.log(JSON.stringify({
    id: data?.user?.id,
    email: data?.user?.email,
    error: error?.message,
  }, null, 2))
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })