require('dotenv').config()
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') })
const readline = require('readline/promises')
const { createClient } = require('@supabase/supabase-js')

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, opts)
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, opts)
const admin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, opts)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

let passed = 0, failed = 0
function check(name, ok, detail = '') {
  ok ? passed++ : failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '   -> ' + detail}`)
}
const day = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data }
const pause = async msg => { console.log('\n>>> ' + msg); await rl.question('Press Enter when done... ') }
const stamp = Date.now()

async function main() {
  // ---------- setup ----------
  const orgId = must(await svc.from('organizations').select('id').like('name', 'TEST_TERTIARY_BILLING_%')
    .order('created_at', { ascending: false }).limit(1).single(), 'find test org').id

  const email = `tb-admin-${stamp}@eduxellence-test.invalid`, pw = 'TbTest!2026x'
  const u = must(await svc.auth.admin.createUser({ email, password: pw, email_confirm: true,
    user_metadata: { role: 'teacher', organization_id: orgId, name: 'TB Test Admin' } }), 'create user')
  must(await svc.from('users').update({ role: 'admin' }).eq('id', u.user.id), 'promote')
  must(await admin.auth.signInWithPassword({ email, password: pw }), 'sign in')
  const other = must(await svc.from('organizations').select('id').neq('id', orgId).limit(1).single(), 'other org')
  console.log(`\nTest org: ${orgId}\nTest admin: ${email} / ${pw}\n`)

  const confirm = (gatewayRef, quoteRef, amount, currency, org = orgId) => svc.rpc('confirm_tertiary_payment',
    { p_provider: 'paystack', p_gateway_reference: gatewayRef, p_quote_reference: quoteRef, p_org_id: org, p_amount: amount, p_currency: currency })
  const ent = async () => must(await admin.rpc('get_tertiary_entitlement', { p_org_id: orgId }), 'entitlement')

  // ---------- plan and currency ----------
  let r = await admin.rpc('set_tertiary_plan', { p_org_id: orgId, p_tier_key: 'tertiary_starter', p_billing_cycle: 'termly', p_currency: 'USD' })
  check('USD plan rejected while USD is not a supported currency', !!r.error && /not available/i.test(r.error.message), r.error?.message)
  r = await admin.rpc('set_tertiary_plan', { p_org_id: orgId, p_tier_key: 'tertiary_starter', p_billing_cycle: 'termly' })
  check('NGN starter/termly plan set', !r.error, r.error?.message)

  const est = must(await admin.rpc('get_tertiary_billing_estimate', { p_org_id: orgId }), 'estimate')
  check('estimate = 3 students x 150 NGN = 450', Number(est.amount_due) === 450 && est.currency === 'NGN' && est.student_count === 3, JSON.stringify(est))

  // ---------- quote lifecycle ----------
  const q1 = must(await admin.rpc('create_tertiary_payment_quote', { p_org_id: orgId, p_reference: `edux-tb-q1-${stamp}` }), 'quote 1')
  check('quote locks 450 NGN for the term period', Number(q1.amount_due) === 450 && q1.currency === 'NGN' && q1.period_start === day(-30) && q1.period_end === day(60) && q1.quote_kind === 'period', JSON.stringify(q1))
  const q1b = must(await admin.rpc('create_tertiary_payment_quote', { p_org_id: orgId, p_reference: `edux-tb-q1b-${stamp}` }), 'quote 1b')
  check('second request reuses the same pending quote', q1b.id === q1.id && q1b.reused === true, JSON.stringify(q1b))
  r = await admin.rpc('set_tertiary_plan', { p_org_id: orgId, p_tier_key: 'tertiary_growth', p_billing_cycle: 'termly' })
  check('plan change blocked while a quote is pending', !!r.error && /in progress/i.test(r.error.message), r.error?.message)

  // ---------- forged and mismatched confirmations ----------
  r = await confirm(`gw-amt-${stamp}`, q1.reference, 449, 'NGN')
  check('wrong amount -> needs_review (amount_mismatch)', r.data?.status === 'needs_review' && r.data?.reason === 'amount_mismatch', JSON.stringify(r))
  r = await confirm(`gw-cur-${stamp}`, q1.reference, 450, 'USD')
  check('wrong currency -> needs_review (currency_mismatch)', r.data?.status === 'needs_review' && r.data?.reason === 'currency_mismatch', JSON.stringify(r))
  r = await confirm(`gw-org-${stamp}`, q1.reference, 450, 'NGN', other.id)
  check('wrong organization -> needs_review (organization_mismatch)', r.data?.status === 'needs_review' && r.data?.reason === 'organization_mismatch', JSON.stringify(r))
  let e = await ent()
  check('entitlement still never_paid after three rejected payments', e.status === 'never_paid' && e.entitled === false, JSON.stringify(e))

  // ---------- real confirmation, idempotency ----------
  const okRef = `gw-ok-${stamp}`
  r = await confirm(okRef, q1.reference, 450, 'NGN')
  check('correct payment applied as initial', r.data?.status === 'applied' && r.data?.kind === 'initial', JSON.stringify(r))
  r = await confirm(okRef, q1.reference, 450, 'NGN')
  check('same gateway reference delivered again -> duplicate, no second apply', r.data?.duplicate === true, JSON.stringify(r))
  const rows = must(await svc.from('processed_payments').select('id').eq('provider', 'paystack').eq('reference', okRef), 'ledger rows')
  check('exactly one ledger row for that reference', rows.length === 1, `${rows.length} rows`)
  r = await confirm(`gw-second-${stamp}`, q1.reference, 450, 'NGN')
  check('second genuine payment on a confirmed quote -> needs_review (quote_confirmed)', r.data?.status === 'needs_review' && r.data?.reason === 'quote_confirmed', JSON.stringify(r))
  e = await ent()
  check('entitlement paid, tier and period come from the payment', e.status === 'paid' && e.paid?.tier_key === 'tertiary_starter' && e.paid?.period_end === day(60), JSON.stringify(e))
  const orgRow = must(await svc.from('organizations').select('subscription_status, subscription_expires_at').eq('id', orgId).single(), 'org row')
  check('organization mirror: active, expires on period end', orgRow.subscription_status === 'active' && String(orgRow.subscription_expires_at).startsWith(day(60)), JSON.stringify(orgRow))

  // ---------- next period, paid-period guard ----------
  const q2 = must(await admin.rpc('create_tertiary_payment_quote', { p_org_id: orgId, p_reference: `edux-tb-q2-${stamp}` }), 'quote 2')
  check('next quote moves to Second Term', /Second Term/.test(q2.period_label || '') && q2.period_start === day(90), JSON.stringify(q2))
  r = await admin.rpc('cancel_tertiary_payment_quote', { p_quote_id: q2.id })
  check('pending quote can be cancelled', !r.error, r.error?.message)
  r = await admin.rpc('set_tertiary_plan', { p_org_id: orgId, p_tier_key: 'tertiary_growth', p_billing_cycle: 'termly' })
  check('tier change blocked during an active paid period', !!r.error && /paid period/i.test(r.error.message), r.error?.message)

  // ---------- access control ----------
  r = await admin.rpc('create_tertiary_payment_quote', { p_org_id: other.id, p_reference: `edux-tb-x-${stamp}` })
  check('cannot create a quote for another organization', !!r.error && /permission/i.test(r.error.message), r.error?.message)
  r = await anon.rpc('confirm_tertiary_payment', { p_provider: 'paystack', p_gateway_reference: 'x', p_quote_reference: 'x', p_org_id: orgId, p_amount: 1, p_currency: 'NGN' })
  check('anon cannot call confirm_tertiary_payment', r.error?.code === '42501', JSON.stringify(r.error))
  r = await admin.rpc('confirm_tertiary_payment', { p_provider: 'paystack', p_gateway_reference: 'x', p_quote_reference: 'x', p_org_id: orgId, p_amount: 1, p_currency: 'NGN' })
  check('institution admin cannot call confirm_tertiary_payment', r.error?.code === '42501', JSON.stringify(r.error))
  r = await admin.from('tertiary_payment_quotes').select('id').limit(1)
  check('institution admin cannot read the quotes table directly', !!r.error, JSON.stringify(r))

  // ---------- expiry (needs the SQL editor) ----------
  const q3 = must(await admin.rpc('create_tertiary_payment_quote', { p_org_id: orgId, p_reference: `edux-tb-q3-${stamp}` }), 'quote 3')
  await pause(`Run in the SQL editor:\n\nupdate tertiary_payment_quotes set expires_at = now() - interval '1 minute' where reference = '${q3.reference}';`)
  r = await confirm(`gw-exp-${stamp}`, q3.reference, Number(q3.amount_due), q3.currency)
  check('payment against an expired quote -> needs_review (quote_expired)', r.data?.status === 'needs_review' && r.data?.reason === 'quote_expired', JSON.stringify(r))

  // ---------- grace and expiry of entitlement (needs the SQL editor) ----------
  await pause(`Run in the SQL editor:\n\nupdate processed_payments set period_start = current_date - 40, period_end = current_date - 3 where account_id = '${orgId}' and payment_kind = 'initial' and payment_status = 'applied';`)
  e = await ent()
  check('3 days after period end -> grace, still entitled', e.status === 'grace' && e.entitled === true, JSON.stringify(e))
  await pause(`Run in the SQL editor:\n\nupdate processed_payments set period_end = current_date - 10 where account_id = '${orgId}' and payment_kind = 'initial' and payment_status = 'applied';`)
  e = await ent()
  check('10 days after period end -> expired, not entitled', e.status === 'expired' && e.entitled === false, JSON.stringify(e))

  console.log(`\n${passed} passed, ${failed} failed`)
  console.log(`Leave the test org in place; it is reused for the UI and founding tests. Org: ${orgId}`)
  rl.close()
  process.exit(failed ? 1 : 0)
}
main().catch(e => { console.error('\nTEST RUN ABORTED:', e.message); rl.close(); process.exit(1) })