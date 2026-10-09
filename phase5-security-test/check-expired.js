require('dotenv').config()
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')
const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
async function main() {
  const { error: e1 } = await c.auth.signInWithPassword({
    email: 'tb-admin-1791572046942@eduxellence-test.invalid', password: 'TbTest!2026x' })
  if (e1) { console.error('sign-in failed:', e1.message); return }
  const { data, error } = await c.rpc('get_tertiary_entitlement', { p_org_id: 'cc737aa6-553f-40e6-bac9-ebaccddf972a' })
  console.log(JSON.stringify({ data, error }, null, 2))
}
main()