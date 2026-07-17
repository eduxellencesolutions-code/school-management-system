'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { checkDowngradeEligibility } from '@/lib/plans/downgrade'
import type { PlanKey } from '@/lib/plans/config'

export async function requestDowngrade(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const targetPlan = formData.get('target_plan') as PlanKey

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const orgId = profile?.organization_id

  if (orgId && !isAdmin) return { success: false, message: 'Only administrators can change the subscription plan' }

  let usage = { students: 0, teachers: 0, classes: 0 }

  if (orgId) {
    const { count: students } = await supabase.from('learners').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
    const { count: teachers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('role', 'teacher')
    const { count: classes } = await supabase.from('groups').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
    usage = { students: students ?? 0, teachers: teachers ?? 0, classes: classes ?? 0 }
  } else {
    const { count: students } = await supabase.from('learners').select('*', { count: 'exact', head: true }).eq('instructor_id', user.id)
    const { count: classes } = await supabase.from('groups').select('*', { count: 'exact', head: true }).eq('instructor_id', user.id)
    usage = { students: students ?? 0, teachers: 1, classes: classes ?? 0 }
  }

  const { eligible, checks } = checkDowngradeEligibility(targetPlan, usage)

  if (!eligible) {
    return {
      success: false,
      message: 'Your current usage exceeds the limits of that plan.',
      checks: checks.filter(c => c.overLimit),
    }
  }

  const table = orgId ? 'organizations' : 'users'
  const idColumn = orgId ? orgId : user.id

  const { error } = await supabase
    .from(table)
    .update({ subscription_plan: targetPlan })
    .eq('id', idColumn)

  if (error) {
    console.error('Downgrade error:', error)
    return { success: false, message: 'Failed to change plan' }
  }

  revalidatePath('/settings')
  return { success: true }
}