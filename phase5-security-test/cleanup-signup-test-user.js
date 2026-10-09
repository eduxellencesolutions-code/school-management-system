// cleanup-signup-test-user.js
require('dotenv').config({ path: '../.env.local' })
const { createClient } = require('@supabase/supabase-js')
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)
async function main() {
  const { error } = await admin.auth.admin.deleteUser('107b65fe-9106-4836-9199-a09e4e8b6baf')
  console.log('deleteUser:', error ? `ERROR: ${error.message}` : 'deleted')
}
main()