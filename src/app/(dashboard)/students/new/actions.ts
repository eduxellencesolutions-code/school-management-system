'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { canAddStudent, AccountRef } from '@/lib/plans/gating'

interface CreateStudentInput {
  first_name: string
  last_name: string
  other_names?: string
  admission_number?: string
  gender?: 'M' | 'F' | 'Other'
  date_of_birth?: string
  guardian_name?: string
  guardian_phone?: string
  email?: string
  phone?: string
  group_id: string
}

export async function createStudent(
  input: CreateStudentInput
): Promise<{ success: boolean; error?: string; groupId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!input.first_name || !input.last_name || !input.group_id) {
    return { success: false, error: 'First name, last name, and class are required' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, subscription_plan')
    .eq('id', user.id)
    .single()

  // Determine the acting plan and the correct usage-tracking ref —
  // institutions are gated at the org level, solo teachers at the user level.
  let plan: string
  let ref: AccountRef
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_plan')
      .eq('id', profile.organization_id)
      .single()
    plan = org?.subscription_plan ?? 'free'
    ref = { type: 'org', orgId: profile.organization_id }
  } else {
    plan = profile?.subscription_plan ?? 'free'
    ref = { type: 'solo', userId: user.id }
  }

  const gate = await canAddStudent(plan, ref)
  if (!gate.allowed) {
    return { success: false, error: gate.reason }
  }

  const { error } = await supabase.from('learners').insert({
    organization_id: profile?.organization_id ?? null,
    group_id: input.group_id,
    first_name: input.first_name,
    last_name: input.last_name,
    other_names: input.other_names || null,
    admission_number: input.admission_number || null,
    gender: input.gender || null,
    date_of_birth: input.date_of_birth || null,
    guardian_name: input.guardian_name || null,
    guardian_phone: input.guardian_phone || null,
    email: input.email || null,
    phone: input.phone || null,
    enrollment_date: new Date().toISOString().split('T')[0],
    is_active: true,
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Admission number already exists' }
    }
    console.error('Error creating student:', error)
    return { success: false, error: 'Failed to add student' }
  }

  revalidatePath('/students')
  return { success: true, groupId: input.group_id }
}
