import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import fs from 'fs'

async function globalSetup() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const password = `E2eFixture_Pw_${randomUUID().replace(/-/g, '')}`

  // 1. Fixture organizations + group (SQL, trigger-suppressed)
  const { data: orgs, error: orgsErr } = await admin.rpc('setup_e2e_orgs')
  if (orgsErr) throw new Error(`E2E org setup failed: ${orgsErr.message}`)

  // 2. Pre-claim the signup-notification outbox rows BEFORE creating users,
  //    so the signup trigger cannot fire the real production webhook.
  //    Done through a SQL function because the API role has no access to the
  //    table itself. The result is checked; a failure here must stop the run.
  const ids = {
    staffA: randomUUID(),
    staffB: randomUUID(),
    student: randomUUID(),
    parent: randomUUID(),
  }
  const idList = Object.values(ids)

  const { error: claimErr } = await admin.rpc('e2e_preclaim_signup_notifications', {
    p_ids: idList,
  })
  if (claimErr) throw new Error(`Outbox pre-claim failed: ${claimErr.message}`)

  // 3. Create the auth users through the real admin API.
  const people = [
    { key: 'staffA', email: 'e2e-staff-a@eduxellence.invalid', orgId: orgs.orgA },
    { key: 'staffB', email: 'e2e-staff-b@eduxellence.invalid', orgId: orgs.orgB },
    { key: 'student', email: 'e2e-student@eduxellence.invalid', orgId: orgs.orgA },
    { key: 'parent', email: 'e2e-parent@eduxellence.invalid', orgId: orgs.orgA },
  ] as const

  for (const p of people) {
    const { error } = await admin.auth.admin.createUser({
      id: ids[p.key],
      email: p.email,
      password,
      email_confirm: true,
      user_metadata: { role: 'teacher', organization_id: p.orgId },
    })
    if (error) throw new Error(`Failed to create ${p.key}: ${error.message}`)
  }

  // Safety check: confirm NO live notification was queued for any fixture
  // user. If one was, stop the run and say so.
  const { data: liveCount, error: countErr } = await admin.rpc(
    'e2e_count_live_signup_notifications',
    { p_ids: idList }
  )
  if (countErr) throw new Error(`Notification safety check failed: ${countErr.message}`)
  if (liveCount > 0) {
    throw new Error(
      `${liveCount} live signup notification(s) were queued for E2E fixture users. ` +
      `Stopping. Inspect signup_notification_outbox for @eduxellence.invalid rows.`
    )
  }

  // Staff are org admins. Students and parents have NO row in public.users
  // in the real system, so remove the row the signup trigger created.
  const { error: roleErr } = await admin
    .from('users').update({ role: 'admin' }).in('id', [ids.staffA, ids.staffB])
  if (roleErr) throw new Error(`Failed to promote staff: ${roleErr.message}`)

  const { error: delErr } = await admin
    .from('users').delete().in('id', [ids.student, ids.parent])
  if (delErr) throw new Error(`Failed to remove student/parent users rows: ${delErr.message}`)

  // 4. Learner, parent link, and the four domain lifecycles (SQL)
  const { data: dom, error: domErr } = await admin.rpc('setup_e2e_domain_fixtures', {
    p_org_a: orgs.orgA,
    p_org_b: orgs.orgB,
    p_group_a: orgs.groupA,
    p_staff_a: ids.staffA,
    p_staff_b: ids.staffB,
    p_student: ids.student,
    p_parent: ids.parent,
  })
  if (domErr) throw new Error(`E2E domain fixture setup failed: ${domErr.message}`)

  const fixtures = {
    orgA: orgs.orgA,
    orgB: orgs.orgB,
    staffA: { id: ids.staffA, email: 'e2e-staff-a@eduxellence.invalid' },
    staffB: { id: ids.staffB, email: 'e2e-staff-b@eduxellence.invalid' },
    student: { id: ids.student, email: 'e2e-student@eduxellence.invalid' },
    parent: { id: ids.parent, email: 'e2e-parent@eduxellence.invalid' },
    password,
    domains: dom.domains,
  }

  fs.writeFileSync('tests/e2e/.fixtures.json', JSON.stringify(fixtures, null, 2))
  console.log('E2E fixtures created (IDs only; password not logged).')
}

export default globalSetup