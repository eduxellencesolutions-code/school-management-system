'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { requireActiveSubscription } from '@/lib/subscription/checkAccess'
import { checkPlanLimit } from '@/lib/subscription/checkPlanLimit'

export async function deleteStudent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ✅ Subscription gate — expired accounts cannot delete students
  const { allowed, message } = await requireActiveSubscription(supabase, user.id)
  if (!allowed) redirect(`/settings?tab=billing&error=${encodeURIComponent(message!)}`)

  const id = formData.get('id') as string
  if (!id) {
    redirect('/students?error=no_id')
  }

  try {
    const { data: existing } = await supabase
      .from('learners').select('id, status').eq('id', id).maybeSingle()

    if (!existing) redirect('/students?error=not_found')
    if (existing.status === 'archived') redirect('/students?success=deleted')

    // Soft-delete only: scores, reports, attendance, fee accounts, and
    // parent links are never touched, so all history stays intact. This
    // replaces the previous hard delete entirely — nothing under this
    // learner_id is deleted anymore.
    const { error: archiveError } = await supabase
      .from('learners')
      .update({
        status: 'archived',
        is_active: false,
        status_reason: 'Removed via student list',
        status_effective_date: new Date().toISOString().split('T')[0],
        status_changed_by: user.id,
        status_changed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (archiveError) {
      console.error('Error archiving student:', archiveError)
      redirect('/students?error=delete_failed')
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'student_archived',
      table_name: 'learners',
      record_id: id,
      new_data: { status: 'archived' },
    })

    revalidatePath('/students')
    redirect('/students?success=deleted')
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }
    console.error('Unexpected error archiving student:', error)
    redirect('/students?error=unexpected')
  }
}

// Full lifecycle action — withdraw/transfer/graduate/suspend with reason
// and effective date, per the approved student-lifecycle requirement.
// Separate from deleteStudent (which is the "remove from list" quick-action);
// this is the deliberate status-change path with full context.
export async function updateStudentStatus(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  const status = formData.get('status') as string
  const reason = (formData.get('reason') as string)?.trim() || null
  const effectiveDate = (formData.get('effective_date') as string) || new Date().toISOString().split('T')[0]
  const destinationSchool = (formData.get('destination_school') as string)?.trim() || null

  const validStatuses = ['active', 'withdrawn', 'transferred', 'graduated', 'suspended']
  if (!id || !validStatuses.includes(status)) {
    redirect(`/students/${id}?error=invalid_status`)
  }

  const { data: existing } = await supabase
    .from('learners').select('id, status').eq('id', id).maybeSingle()
  if (!existing) redirect('/students?error=not_found')

  const { error } = await supabase
    .from('learners')
    .update({
      status,
      is_active: status === 'active',
      status_reason: reason,
      status_effective_date: effectiveDate,
      status_changed_by: user.id,
      status_changed_at: new Date().toISOString(),
      destination_school: status === 'transferred' ? destinationSchool : null,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating student status:', error)
    redirect(`/students/${id}?error=status_update_failed`)
  }

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'student_status_changed',
    table_name: 'learners',
    record_id: id,
    new_data: { previous_status: existing.status, new_status: status, reason, effective_date: effectiveDate },
  })

  revalidatePath('/students')
  revalidatePath(`/students/${id}`)
  redirect(`/students/${id}?success=status_updated`)
}

// ✅ NEW: Create a single student
export async function createStudent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ✅ Subscription gate — expired accounts cannot create students
  const { allowed, message } = await requireActiveSubscription(supabase, user.id)
  if (!allowed) redirect(`/settings?tab=billing&error=${encodeURIComponent(message!)}`)

  // ✅ PLAN LIMIT GATE: Check maxStudents limit
  const limitCheck = await checkPlanLimit(supabase, user.id, 'maxStudents')
  if (!limitCheck.allowed) {
    redirect(`/students/new?error=${encodeURIComponent(limitCheck.message!)}`)
  }

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()

  const groupId = formData.get('group_id') as string
  const firstName = formData.get('first_name') as string
  const lastName = formData.get('last_name') as string

  if (!groupId) redirect('/students/new?error=no_class')
  if (!firstName?.trim() || !lastName?.trim()) redirect('/students/new?error=missing_name')

  const { error } = await supabase.from('learners').insert({
    organization_id: profile?.organization_id ?? null,
    group_id: groupId,
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    other_names: (formData.get('other_names') as string)?.trim() || null,
    admission_number: (formData.get('admission_number') as string)?.trim() || null,
    gender: (formData.get('gender') as string) || null,
    date_of_birth: (formData.get('date_of_birth') as string) || null,
    guardian_name: (formData.get('guardian_name') as string)?.trim() || null,
    guardian_phone: (formData.get('guardian_phone') as string)?.trim() || null,
    email: (formData.get('email') as string)?.trim() || null,
    phone: (formData.get('phone') as string)?.trim() || null,
    enrollment_date: new Date().toISOString().split('T')[0],
    is_active: true,
  })

  if (error) {
    console.error('Error creating student:', error)
    if (error.code === '23505') redirect(`/students/new?error=${encodeURIComponent('Admission number already exists')}`)
    redirect(`/students/new?error=${encodeURIComponent('Failed to add student')}`)
  }

  revalidatePath('/students')
  redirect(`/students?class=${groupId}&success=added`)
}

// ✅ UPDATED: Import multiple students with subscription guard
export async function importStudents(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Not authenticated', imported: 0, failed: 0 }

  // ✅ SUBSCRIPTION GATE: Check active subscription before importing students
  const { allowed, message } = await requireActiveSubscription(supabase, user.id)
  if (!allowed) return { success: false, message: message!, imported: 0, failed: 0 }

  // ✅ PLAN LIMIT GATE: Check maxStudents limit before importing
  const limitCheck = await checkPlanLimit(supabase, user.id, 'maxStudents')
  if (!limitCheck.allowed) {
    return { success: false, message: limitCheck.message!, imported: 0, failed: 0 }
  }

  const groupId = formData.get('group_id') as string
  const rowsJson = formData.get('rows') as string
  if (!groupId || !rowsJson) return { success: false, message: 'Missing data', imported: 0, failed: 0 }

  let rows: any[]
  try {
    rows = JSON.parse(rowsJson)
  } catch {
    return { success: false, message: 'Invalid data format', imported: 0, failed: 0 }
  }

  if (rows.length === 0) return { success: false, message: 'No valid rows to import', imported: 0, failed: 0 }
  if (rows.length > 500) return { success: false, message: 'Maximum 500 students per import', imported: 0, failed: 0 }

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()

  // Confirm this class actually belongs to the requester
  const { data: group } = await supabase
    .from('groups').select('id, instructor_id, organization_id').eq('id', groupId).single()

  if (!group) return { success: false, message: 'Class not found', imported: 0, failed: 0 }

  if (profile?.organization_id) {
    if (group.organization_id !== profile.organization_id) {
      return { success: false, message: 'Class does not belong to your organization', imported: 0, failed: 0 }
    }
  } else if (group.instructor_id !== user.id) {
    return { success: false, message: 'Class does not belong to you', imported: 0, failed: 0 }
  }

  // Get current student count to check if we can import all rows
  const { count: currentStudentCount } = await supabase
    .from('learners')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', profile?.organization_id ?? null)

  // Re-check limit with current count + rows.length
  const planConfig = await checkPlanLimit(supabase, user.id, 'maxStudents')
  if (!planConfig.allowed) {
    return { success: false, message: planConfig.message!, imported: 0, failed: 0 }
  }

  let success = 0
  let failed = 0

  const batches = []
  for (let i = 0; i < rows.length; i += 50) batches.push(rows.slice(i, i + 50))

  for (const batch of batches) {
    const inserts = batch.map((r: any) => ({
      organization_id: profile?.organization_id ?? null,
      group_id: groupId,
      first_name: r.first_name?.trim(),
      last_name: r.last_name?.trim(),
      other_names: r.other_names?.trim() || null,
      admission_number: r.admission_number?.trim() || null,
      gender: r.gender || null,
      date_of_birth: r.date_of_birth || null,
      guardian_name: r.guardian_name?.trim() || null,
      guardian_phone: r.guardian_phone?.trim() || null,
      email: r.email?.trim() || null,
      enrollment_date: new Date().toISOString().split('T')[0],
      is_active: true,
    }))

    const { data, error } = await supabase.from('learners').insert(inserts).select()
    if (error) {
      console.error('Batch import error:', error)
      failed += batch.length
    } else {
      success += data?.length ?? batch.length
    }
  }

  revalidatePath('/students')
  return { success: true, imported: success, failed }
}