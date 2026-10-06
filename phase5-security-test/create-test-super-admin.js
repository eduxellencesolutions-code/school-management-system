require('dotenv').config({ path: '../.env.local' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  // ── Super-admin auth user ────────────────────────────────────────────
  const { data: superData, error: superError } = await admin.auth.admin.createUser({
    email: 'test-super-admin@eduxellence-test.invalid',
    password: 'TestSuperAdmin2026!',
    email_confirm: true,
    user_metadata: {
      name: 'Test Super Admin',
      account_type: 'staff',
    },
  })
  console.log('Super admin:', JSON.stringify({
    id: superData?.user?.id,
    email: superData?.user?.email,
    error: superError?.message,
  }, null, 2))

  // ── Test org's admin user ────────────────────────────────────────────
  const { data: adminData, error: adminError } = await admin.auth.admin.createUser({
    email: 'test-org-admin@eduxellence-test.invalid',
    password: 'TestOrgAdmin2026!',
    email_confirm: true,
    user_metadata: {
      name: 'Test Org Admin',
      role: 'admin',
    },
  })
  console.log('Org admin:', JSON.stringify({
    id: adminData?.user?.id,
    email: adminData?.user?.email,
    error: adminError?.message,
  }, null, 2))

  // ── Test org's teacher user ──────────────────────────────────────────
  const { data: teacherData, error: teacherError } = await admin.auth.admin.createUser({
    email: 'test-org-teacher@eduxellence-test.invalid',
    password: 'TestOrgTeacher2026!',
    email_confirm: true,
    user_metadata: {
      name: 'Test Org Teacher',
      role: 'teacher',
    },
  })
  console.log('Org teacher:', JSON.stringify({
    id: teacherData?.user?.id,
    email: teacherData?.user?.email,
    error: teacherError?.message,
  }, null, 2))
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })