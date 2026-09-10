// FILE: src/app/api/tertiary/students/create-portal-account/route.ts
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

function generatePassword() {
  return randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12)
}

export async function POST(req: Request) {
  const { learnerId } = await req.json()

  // 1. Verify the CALLER via their real session — never trust a
  //    client-supplied identity for who's making this request.
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('organization_id, role').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  // 2. Load the learner + verify department scope server-side —
  //    same authorization boundary as bulk_upload_students.
  const { data: learner } = await supabase
    .from('learners')
    .select('id, organization_id, admission_number, email, first_name, last_name, group_id, groups(department_id)')
    .eq('id', learnerId).single()

  if (!learner || learner.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const isAdmin = profile.role === 'admin'
  let isScoped = isAdmin
  if (!isAdmin) {
    const { data: hasPerm } = await supabase.rpc('has_permission', { p_user_id: user.id, p_permission_key: 'academic.manage_department_students' })
    const { data: scope } = await supabase
      .from('academic_reviewer_scopes')
      .select('id')
      .eq('user_id', user.id).eq('scope_level', 'department')
      .eq('department_id', (learner as any).groups?.department_id)
      .maybeSingle()
    isScoped = !!hasPerm && !!scope
  }
  if (!isScoped) return NextResponse.json({ error: 'Not authorized for this department' }, { status: 403 })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  // 3. Provision the actual auth account. Service role key — never
  //    sent to the client, only used here server-side.
  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const loginEmail = learner.email || `${learner.admission_number.replace(/[^a-zA-Z0-9]/g, '')}.${learner.organization_id.slice(0, 8)}@portal.eduxellence.local`
  const password = generatePassword()

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({ email: loginEmail, password, email_confirm: true })
  if (authError || !authUser.user) {
    return NextResponse.json({ error: authError?.message ?? 'Could not create account' }, { status: 500 })
  }

  const { error: linkError } = await supabase
    .from('learners')
    .update({
      auth_user_id: authUser.user.id, portal_status: 'active',
      portal_activated_at: new Date().toISOString(),
      portal_credential_generated_by: user.id, portal_credential_generated_at: new Date().toISOString(),
    })
    .eq('id', learnerId)

  if (linkError) {
    // Never leave an orphaned auth account if the link write fails.
    await admin.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  // Shown ONCE. Never stored in plaintext, never retrievable again
  // after this response — matches "don't expose credentials
  // unnecessarily after activation."
  return NextResponse.json({
    login_email: loginEmail, initial_password: password,
    student_name: `${learner.first_name} ${learner.last_name}`, admission_number: learner.admission_number,
  })
}