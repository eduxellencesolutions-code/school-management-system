// tests/application-rls/cross-org-learner-access.test.mjs
//
// APPLICATION-LAYER RLS TEST — closes the gap SQL Test 2 explicitly could
// not close (that harness runs as the table owner, which bypasses RLS
// regardless of role; SET ROLE is also disallowed inside a SECURITY
// DEFINER function). This script uses two REAL Supabase Auth sessions,
// signed in via the actual anon-key client — the identical code path the
// real application uses — so it genuinely exercises the authenticated
// PostgREST/RLS boundary rather than approximating it.
//
// Run with: node tests/application-rls/cross-org-learner-access.test.mjs
// Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
//           SUPABASE_SERVICE_ROLE_KEY — loaded from .env.local at the
//           project root via the inline loader below (no dotenv dep).
//
// This is standalone and deliberately outside src/ — it is not part of
// the Next.js app's runtime and should not be bundled/deployed.

// ---- Inline .env.local loader (no dotenv dependency) --------------------
import { readFileSync } from 'fs'
import { resolve } from 'path'

try {
  const envPath = resolve(process.cwd(), '.env.local')
  const envContent = readFileSync(envPath, 'utf8')
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (key && val && process.env[key] === undefined) {
      process.env[key] = val
    }
  }
} catch (e) {
  console.error('Could not read .env.local at project root:', e.message)
  process.exit(1)
}
// ------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('Missing required env vars after loading .env.local:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL set?    ', !!SUPABASE_URL)
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY set?', !!ANON_KEY)
  console.error('  SUPABASE_SERVICE_ROLE_KEY set?   ', !!SERVICE_KEY)
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const results = []
function record(id, description, expected, actual, passed, detail = null) {
  results.push({ id, description, expected, actual, passed, detail })
}

const TEST_PASSWORD = `TestPw_${randomUUID()}!`

async function main() {
  let orgA, orgB, userA, userB, groupA, groupB, learnerA, learnerB

  try {
    // ---- Fixture setup (service-role client — this part is intentionally
    // NOT the thing under test; only the assertions below use the two
    // signed-in sessions) --------------------------------------------------

    const { data: oa, error: oaErr } = await admin
      .from('organizations')
      .insert({ name: 'TEST_APPRLS_ORG_A' })
      .select('id')
      .single()
    if (oaErr) throw new Error(`Failed to create org A: ${oaErr.message}`)
    orgA = oa.id

    const { data: ob, error: obErr } = await admin
      .from('organizations')
      .insert({ name: 'TEST_APPRLS_ORG_B' })
      .select('id')
      .single()
    if (obErr) throw new Error(`Failed to create org B: ${obErr.message}`)
    orgB = ob.id

    const { data: ga, error: gaErr } = await admin
      .from('groups')
      .insert({ organization_id: orgA, name: 'TEST_APPRLS_GROUP_A', type: 'class' })
      .select('id')
      .single()
    if (gaErr) throw new Error(`Failed to create group A: ${gaErr.message}`)
    groupA = ga.id

    const { data: gb, error: gbErr } = await admin
      .from('groups')
      .insert({ organization_id: orgB, name: 'TEST_APPRLS_GROUP_B', type: 'class' })
      .select('id')
      .single()
    if (gbErr) throw new Error(`Failed to create group B: ${gbErr.message}`)
    groupB = gb.id

    // Real signups via admin.auth.admin.createUser — this goes through
    // Supabase Auth properly (unlike the raw auth.users INSERT the SQL
    // harness used), so no manual trigger-suppression is needed here for
    // handle_new_user()'s org-creation branch — but it WILL still enqueue
    // a real signup notification via enqueue_signup_notification(), since
    // that trigger fires on any real auth.users row regardless of how it's
    // created. Pre-claiming the outbox row, same technique as the SQL
    // harness, to prevent the real webhook firing for these test accounts.
    const userAId = randomUUID()
    const userBId = randomUUID()

    await admin.from('signup_notification_outbox').insert([
      { signup_type: 'solo_teacher', entity_id: userAId, payload: {}, status: 'sent', sent_at: new Date().toISOString() },
      { signup_type: 'solo_teacher', entity_id: userBId, payload: {}, status: 'sent', sent_at: new Date().toISOString() },
    ])

    const { data: uaData, error: uaErr } = await admin.auth.admin.createUser({
      id: userAId,
      email: `apprls-test-a-${Date.now()}@eduxellence.invalid`,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'teacher', organization_id: orgA },
    })
    if (uaErr) throw new Error(`Failed to create user A: ${uaErr.message}`)
    userA = uaData.user

    const { data: ubData, error: ubErr } = await admin.auth.admin.createUser({
      id: userBId,
      email: `apprls-test-b-${Date.now()}@eduxellence.invalid`,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'teacher', organization_id: orgB },
    })
    if (ubErr) throw new Error(`Failed to create user B: ${ubErr.message}`)
    userB = ubData.user

    // Promote both to admin (handle_new_user creates them as 'teacher')
    await admin.from('users').update({ role: 'admin' }).in('id', [userA.id, userB.id])

    const { data: la, error: laErr } = await admin
      .from('learners')
      .insert({
        organization_id: orgA, group_id: groupA,
        first_name: 'TestFirstA', last_name: 'TestLastA',
      })
      .select('id')
      .single()
    if (laErr) throw new Error(`Failed to create learner A: ${laErr.message}`)
    learnerA = la.id

    const { data: lb, error: lbErr } = await admin
      .from('learners')
      .insert({
        organization_id: orgB, group_id: groupB,
        first_name: 'TestFirstB', last_name: 'TestLastB',
      })
      .select('id')
      .single()
    if (lbErr) throw new Error(`Failed to create learner B: ${lbErr.message}`)
    learnerB = lb.id

    // ---- The actual test: two REAL signed-in sessions, real anon-key
    // client, real PostgREST calls. This is what Test 2 in the SQL
    // harness structurally could not do. ------------------------------

    const clientA = createClient(SUPABASE_URL, ANON_KEY)
    const { error: signInAErr } = await clientA.auth.signInWithPassword({
      email: userA.email, password: TEST_PASSWORD,
    })
    if (signInAErr) throw new Error(`User A sign-in failed: ${signInAErr.message}`)

    const clientB = createClient(SUPABASE_URL, ANON_KEY)
    const { error: signInBErr } = await clientB.auth.signInWithPassword({
      email: userB.email, password: TEST_PASSWORD,
    })
    if (signInBErr) throw new Error(`User B sign-in failed: ${signInBErr.message}`)

    // TEST R1: User A (Org A) attempts to READ Org B's learner by ID
    {
      const { data, error } = await clientA
        .from('learners')
        .select('id, first_name, organization_id')
        .eq('id', learnerB)
        .maybeSingle()

      const passed = !data && !error  // RLS makes it invisible: no row, no error, not a thrown exception
      record('R1', 'User A (Org A) cannot READ a learner belonging to Org B by supplying its ID directly',
        'no row returned (RLS filters it out)',
        data ? `row returned: ${JSON.stringify(data)}` : 'no row returned',
        passed)
    }

    // TEST R2: reverse direction — User B (Org B) reads Org A's learner
    {
      const { data, error } = await clientB
        .from('learners')
        .select('id, first_name, organization_id')
        .eq('id', learnerA)
        .maybeSingle()

      const passed = !data && !error
      record('R2', 'User B (Org B) cannot READ a learner belonging to Org A by supplying its ID directly',
        'no row returned (RLS filters it out)',
        data ? `row returned: ${JSON.stringify(data)}` : 'no row returned',
        passed)
    }

    // TEST W1: User A attempts to UPDATE Org B's learner by ID
    {
      const { data, error } = await clientA
        .from('learners')
        .update({ first_name: 'HIJACKED_BY_ORG_A' })
        .eq('id', learnerB)
        .select('id')

      // RLS on UPDATE with no matching row affects ZERO rows, not an error —
      // the correct signal is an empty result array, not necessarily `error`.
      const passed = !error && (!data || data.length === 0)
      record('W1', 'User A (Org A) cannot UPDATE a learner belonging to Org B by supplying its ID',
        'zero rows affected',
        error ? `error: ${error.message}` : `${data?.length ?? 0} row(s) affected`,
        passed)
    }

    // TEST W2: reverse direction
    {
      const { data, error } = await clientB
        .from('learners')
        .update({ first_name: 'HIJACKED_BY_ORG_B' })
        .eq('id', learnerA)
        .select('id')

      const passed = !error && (!data || data.length === 0)
      record('W2', 'User B (Org B) cannot UPDATE a learner belonging to Org A by supplying its ID',
        'zero rows affected',
        error ? `error: ${error.message}` : `${data?.length ?? 0} row(s) affected`,
        passed)
    }

    // TEST I1: User A attempts to INSERT a new learner directly INTO Org B
    // by supplying Org B's organization_id and group_id explicitly.
    {
      const { data, error } = await clientA
        .from('learners')
        .insert({ organization_id: orgB, group_id: groupB, first_name: 'Injected', last_name: 'ByOrgA' })
        .select('id')

      const passed = !!error  // this one SHOULD produce an RLS-denial error, not a silent no-op
      record('I1', 'User A (Org A) cannot INSERT a learner claiming Org B as owner',
        'insert rejected with an error',
        error ? `rejected: ${error.message}` : 'insert succeeded — SECURITY FAILURE',
        passed)

      // Defensive cleanup in case this unexpectedly succeeded
      if (data && data.length > 0) {
        await admin.from('learners').delete().eq('id', data[0].id)
      }
    }

    // TEST I2: reverse direction
    {
      const { data, error } = await clientB
        .from('learners')
        .insert({ organization_id: orgA, group_id: groupA, first_name: 'Injected', last_name: 'ByOrgB' })
        .select('id')

      const passed = !!error
      record('I2', 'User B (Org B) cannot INSERT a learner claiming Org A as owner',
        'insert rejected with an error',
        error ? `rejected: ${error.message}` : 'insert succeeded — SECURITY FAILURE',
        passed)

      if (data && data.length > 0) {
        await admin.from('learners').delete().eq('id', data[0].id)
      }
    }

    // Confirm the original rows were genuinely never modified by the
    // rejected UPDATE attempts (belt-and-suspenders on W1/W2).
    {
      const { data: checkA } = await admin.from('learners').select('first_name').eq('id', learnerA).single()
      const { data: checkB } = await admin.from('learners').select('first_name').eq('id', learnerB).single()
      const passed = checkA?.first_name === 'TestFirstA' && checkB?.first_name === 'TestFirstB'
      record('V1', 'Original learner rows were not actually mutated by any rejected cross-org UPDATE attempt',
        'first_name unchanged on both learners',
        `Org A learner first_name=${checkA?.first_name}, Org B learner first_name=${checkB?.first_name}`,
        passed)
    }

  } catch (err) {
    console.error('TEST RUN FAILED:', err.message)
    results.push({ id: 'FATAL', description: 'Test run aborted', expected: 'n/a', actual: err.message, passed: false })
  } finally {
    // ---- Teardown — always runs, even on failure -------------------------
    try {
      if (learnerA) await admin.from('learners').delete().eq('id', learnerA)
      if (learnerB) await admin.from('learners').delete().eq('id', learnerB)
      if (groupA) await admin.from('groups').delete().eq('id', groupA)
      if (groupB) await admin.from('groups').delete().eq('id', groupB)
      if (userA) await admin.auth.admin.deleteUser(userA.id)
      if (userB) await admin.auth.admin.deleteUser(userB.id)
      if (orgA) await admin.from('organizations').delete().eq('id', orgA)
      if (orgB) await admin.from('organizations').delete().eq('id', orgB)
    } catch (cleanupErr) {
      console.error('WARNING: teardown encountered an error — check for leftover TEST_APPRLS_* fixtures manually:', cleanupErr.message)
    }
  }

  // ---- Report ---------------------------------------------------------
  console.log('\n=== Application-Layer RLS Test Results ===\n')
  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.id}: ${r.description}`)
    console.log(`   expected: ${r.expected}`)
    console.log(`   actual:   ${r.actual}`)
    if (r.detail) console.log(`   detail:   ${r.detail}`)
  }
  const failed = results.filter(r => !r.passed)
  console.log(`\n${results.length - failed.length}/${results.length} passed.`)
  if (failed.length > 0) {
    console.log('FAILURES DETECTED — do not treat cross-org RLS as proven until these are resolved.')
    process.exit(1)
  }
}

main()