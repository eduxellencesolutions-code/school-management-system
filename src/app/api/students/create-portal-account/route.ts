import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

function generatePassword() {
  return randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12)
}

export async function POST(req: Request) {
  const { learnerId } = await req.json()

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('organization_id, role').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const { data: learner } = await supabase
    .from('learners')
    .select('id, organization_id, admission_number, email, first_name, last_name')
    .eq('id', learnerId).single()

  if (!learner || learner.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'school_admin'
  const { data: hasPerm } = isAdmin ? { data: true } : await supabase.rpc('has_permission', { p_user_id: user.id, p_permission_key: 'students.manage' })
  if (!hasPerm) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const loginEmail = learner.email || `${learner.admission_number!.replace(/[^a-zA-Z0-9]/g, '')}.${learner.organization_id.slice(0, 8)}@portal.eduxellence.local`
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
    await admin.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  return NextResponse.json({
    login_email: loginEmail, initial_password: password,
    student_name: `${learner.first_name} ${learner.last_name}`, admission_number: learner.admission_number,
  })
}