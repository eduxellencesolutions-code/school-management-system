// founding-auth-baseline.js
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const NIL = '00000000-0000-0000-0000-000000000000'
const calls = [
  ['start_founding_application_review', { p_application_id: NIL }],
  ['qualify_founding_application', { p_application_id: NIL, p_reason: 'baseline test' }],
  ['reject_founding_application', { p_application_id: NIL, p_reason: 'baseline test' }],
]
async function run(label, client) {
  console.log(`\n=== ${label} ===`)
  for (const [fn, args] of calls) {
    const { data, error } = await client.rpc(fn, args)
    console.log(fn.padEnd(36), error ? `${error.code} | ${error.message}` : `NO ERROR: ${JSON.stringify(data)}`)
  }
}
async function signedIn(email, password) {
  const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  const { error } = await c.auth.signInWithPassword({ email, password })
  return error ? (console.log(`sign-in failed for ${email}: ${error.message}`), null) : c
}
async function main() {
  await run('anon (no session)', createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY))
  const inst = await signedIn('eli@eduxellence.org', process.env.ADMIN_TEST_PASSWORD)
  if (inst) await run('eli@eduxellence.org', inst)
  if (process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD) {
    const sa = await signedIn(process.env.SUPER_ADMIN_EMAIL, process.env.SUPER_ADMIN_PASSWORD)
    if (sa) await run('platform super-admin', sa)
  } else console.log('\nsuper-admin test skipped (set SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD)')
}
main()