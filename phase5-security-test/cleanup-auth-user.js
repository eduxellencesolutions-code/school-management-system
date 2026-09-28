const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  const { error } = await admin.auth.admin.deleteUser('1f26256b-3059-468b-a8ae-8176f2c7232b')
  console.log(JSON.stringify({ error }, null, 2))
}
main()