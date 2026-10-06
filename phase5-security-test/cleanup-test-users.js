require('dotenv').config({ path: '../.env.local' })
const { createClient } = require('@supabase/supabase-js')

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const USERS = [
  'a8ad3b7a-afd3-4a76-bcf1-913d56486b9b', // test super-admin
  '84673a3e-6d0d-4ee5-b464-7c766cc584c9', // test org admin
  'ef94a16d-2304-4245-aed4-3097fbe014df', // test org teacher
  '03140de6-f9ba-48c9-a8e2-f6e5ca3a178d', // test staff no-perm
]

async function main() {
  for (const id of USERS) {
    const { error } = await admin.auth.admin.deleteUser(id)
    console.log(id, '→', error ? `ERROR: ${error.message}` : 'deleted')
  }
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })