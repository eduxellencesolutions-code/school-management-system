'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { requireActiveSubscription } from '@/lib/subscription/checkAccess'

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
    // Clear dependent score records first (hard delete requires this
    // if scores.learner_id has a foreign key without ON DELETE CASCADE)
    const { error: scoresError } = await supabase
      .from('scores')
      .delete()
      .eq('learner_id', id)

    if (scoresError) {
      console.error('Error deleting scores:', scoresError)
      redirect('/students?error=delete_failed')
    }

    const { error: deleteError } = await supabase
      .from('learners')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting student:', deleteError)
      redirect('/students?error=delete_failed')
    }

    revalidatePath('/students')
    redirect('/students?success=deleted')
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }
    console.error('Unexpected error deleting student:', error)
    redirect('/students?error=unexpected')
  }
}

// ✅ NEW: Create a single student
export async function createStudent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ✅ Subscription gate — expired accounts cannot create students
  const { allowed, message } = await requireActiveSubscription(supabase, user.id)
  if (!allowed) redirect(`/settings?tab=billing&error=${encodeURIComponent(message!)}`)

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

// ✅ NEW: Import multiple students
export async function importStudents(groupId: string, rows: Array<{
  first_name: string
  last_name: string
  other_names?: string
  admission_number?: string
  gender?: string
  date_of_birth?: string
  guardian_name?: string
  guardian_phone?: string
  email?: string
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ✅ Subscription gate — expired accounts cannot import students
  const { allowed, message } = await requireActiveSubscription(supabase, user.id)
  if (!allowed) redirect(`/settings?tab=billing&error=${encodeURIComponent(message!)}`)

  if (!groupId) return { success: false, imported: 0, failed: 0, error: 'Select a class first' }
  if (rows.length === 0) return { success: false, imported: 0, failed: 0, error: 'No valid rows to import' }
  if (rows.length > 500) return { success: false, imported: 0, failed: 0, error: 'Maximum 500 students per import' }

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, subscription_plan')
    .eq('id', user.id)
    .single()

  // Verify the destination class belongs to this institution/teacher
  const { data: group } = await supabase
    .from('groups')
    .select('id, instructor_id, organization_id')
    .eq('id', groupId)
    .single()

  if (!group) return { success: false, imported: 0, failed: 0, error: 'Class not found' }

  if (profile?.organization_id) {
    if (group.organization_id !== profile.organization_id) {
      return { success: false, imported: 0, failed: 0, error: 'Class does not belong to your organization' }
    }
  } else {
    if (group.instructor_id !== user.id) {
      return { success: false, imported: 0, failed: 0, error: 'Class does not belong to you' }
    }
  }

  let success = 0
  let failed = 0

  const batches: typeof rows[] = []
  for (let i = 0; i < rows.length; i += 50) batches.push(rows.slice(i, i + 50))

  for (const batch of batches) {
    const inserts = batch.map(r => ({
      organization_id: profile?.organization_id ?? null,
      group_id: groupId,
      first_name: r.first_name.trim(),
      last_name: r.last_name.trim(),
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

    const { error, data } = await supabase.from('learners').insert(inserts).select()

    if (error) {
      failed += batch.length
    } else {
      success += data?.length ?? batch.length
    }
  }

  revalidatePath('/students')
  return { success: true, imported: success, failed }
}
