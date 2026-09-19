import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireActiveSubscription } from '@/lib/subscription/checkAccess'
import { checkPlanLimit } from '@/lib/subscription/checkPlanLimit'
import { hasFeature, canAddTeacher } from '@/lib/plans/gating'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const { data: { user: adminUser } } = await supabase.auth.getUser()
  if (!adminUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('organization_id, role').eq('id', adminUser.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  if (profile?.role !== 'admin' && profile?.role !== 'school_admin') {
    return NextResponse.json({ error: 'Only administrators can add teachers' }, { status: 403 })
  }

  const { allowed, message } = await requireActiveSubscription(supabase, adminUser.id)
  if (!allowed) return NextResponse.json({ error: message }, { status: 403 })

  const limitCheck = await checkPlanLimit(supabase, adminUser.id, 'maxTeachers')
  if (!limitCheck.allowed) return NextResponse.json({ error: limitCheck.message }, { status: 403 })

  const { data: org } = await supabase.from('organizations').select('subscription_plan').eq('id', orgId).single()
  const plan = org?.subscription_plan ?? 'free'
  if (!hasFeature(plan, 'teacherManagement')) {
    return NextResponse.json({ error: 'Teacher management is not available on your current plan.' }, { status: 403 })
  }

  const gate = await canAddTeacher(plan, { type: 'org', orgId })
  if (!gate.allowed) return NextResponse.json({ error: gate.reason }, { status: 403 })

  const body = await req.json()
  const { name, email, phone, role, password, classId, subjectIds, subjectGroupMap, isClassTeacher } = body

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
  }
  if (!['teacher', 'lecturer', 'assistant', 'principal'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }
  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { name: name.trim(), role, organization_id: orgId },
  })
  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message ?? 'Failed to create teacher account' }, { status: 500 })
  }
  const teacherId = newUser.user.id

  const { error: updateError } = await admin
    .from('users')
    .update({ name: name.trim(), phone: phone || null, organization_id: orgId, role })
    .eq('id', teacherId)
  if (updateError) {
    await admin.auth.admin.deleteUser(teacherId)
    return NextResponse.json({ error: 'Failed to finish setting up the account' }, { status: 500 })
  }

  if (role === 'principal') {
    return NextResponse.json({ success: true, teacherId, teacherName: name })
  }

  const assignments: { teacher_id: string; class_id?: string; subject_id?: string; role: string; organization_id: string }[] = []
  if (isClassTeacher && classId) {
    assignments.push({ teacher_id: teacherId, class_id: classId, role: 'class_teacher', organization_id: orgId })
  }
  ;(subjectIds ?? []).forEach((subjectId: string) => {
    assignments.push({
      teacher_id: teacherId, class_id: subjectGroupMap?.[subjectId], subject_id: subjectId,
      role: 'subject_teacher', organization_id: orgId,
    })
  })
  if (assignments.length > 0) {
    const { error: assignError } = await admin.from('teacher_assignments').insert(assignments)
    if (assignError) console.error('Assignment error:', assignError)
  }

  return NextResponse.json({ success: true, teacherId, teacherName: name })
}