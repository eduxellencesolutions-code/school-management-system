require('dotenv').config({ path: '../.env.local' })
const { createClient } = require('@supabase/supabase-js')

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

async function main() {
  const { error } = await admin.auth.admin.deleteUser('49fece2a-a4b8-4201-95bc-7786568f07ce')
  console.log('deleteUser:', error ? `ERROR: ${error.message}` : 'deleted')
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })