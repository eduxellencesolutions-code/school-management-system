'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { canAddStudent, AccountRef, getUsageCounts } from '@/lib/plans/gating'
import { getPlanConfig } from '@/lib/plans/config'

interface ImportRow {
  first_name: string
  last_name: string
  other_names?: string
  admission_number?: string
  gender?: string
  date_of_birth?: string
  guardian_name?: string
  guardian_phone?: string
  email?: string
}

interface ImportResult {
  success: boolean
  imported: number
  failed: number
  error?: string
}

export async function importStudents(groupId: string, rows: ImportRow[]): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!groupId) return { success: false, imported: 0, failed: 0, error: 'Select a class first' }
  if (rows.length === 0) return { success: false, imported: 0, failed: 0, error: 'No valid rows to import' }
  if (rows.length > 500) return { success: false, imported: 0, failed: 0, error: 'Maximum 500 students per import' }

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, subscription_plan')
    .eq('id', user.id)
    .single()

  // Verify the destination class actually belongs to this
  // institution/teacher — same ownership check as createSubject.
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

  let plan: string
  let ref: AccountRef
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations').select('subscription_plan').eq('id', profile.organization_id).single()
    plan = org?.subscription_plan ?? 'free'
    ref = { type: 'org', orgId: profile.organization_id }
  } else {
    plan = profile?.subscription_plan ?? 'free'
    ref = { type: 'solo', userId: user.id }
  }

  // Gate: check whether the CURRENT usage already allows at least
  // one more student, then check the PROJECTED total against the limit
  // so we never insert a batch that would blow past the cap.
  const config = getPlanConfig(plan)
  const usage = await getUsageCounts(ref)
  const projectedTotal = usage.students + rows.length

  if (config.limits.maxStudents !== 'unlimited' && projectedTotal > config.limits.maxStudents) {
    const remaining = Math.max(0, config.limits.maxStudents - usage.students)
    return {
      success: false,
      imported: 0,
      failed: 0,
      error: remaining > 0
        ? `This import would exceed your student limit. You can add ${remaining} more student${remaining !== 1 ? 's' : ''} on the ${config.label} plan (${usage.students}/${config.limits.maxStudents} used). Upgrade to import all ${rows.length}.`
        : `Student limit reached (${config.limits.maxStudents} max on ${config.label} plan). Upgrade to add more students.`,
    }
  }

  let success = 0
  let failed = 0

  const batches: ImportRow[][] = []
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
