import { SupabaseClient } from '@supabase/supabase-js'
import { getPlanConfig } from '@/lib/plans/config'

type LimitType = 'maxStudents' | 'maxTeachers' | 'maxClasses' | 'maxSubjects' | 'maxCustomTemplates'

export async function checkPlanLimit(
  supabase: SupabaseClient,
  userId: string,
  limitType: LimitType
): Promise<{ allowed: boolean; message?: string }> {
  const { data: profile } = await supabase
    .from('users').select('organization_id, subscription_plan').eq('id', userId).single()

  const orgId = profile?.organization_id
  const plan = orgId
    ? (await supabase.from('organizations').select('subscription_plan').eq('id', orgId).single()).data?.subscription_plan
    : profile?.subscription_plan

  const config = getPlanConfig(plan ?? 'free')
  let limit = config.limits[limitType]

  // Solo teachers on the free plan get a lower cap (10) than institutions on the same plan (30)
  if (limitType === 'maxStudents' && plan === 'free' && !orgId) {
    limit = 10
  }

  // Premium School has a variable capacity stored per-org, overriding the static config default
  if (limitType === 'maxStudents' && plan === 'premium_school' && orgId) {
    const { data: orgRow } = await supabase.from('organizations').select('student_capacity').eq('id', orgId).single()
    if (orgRow?.student_capacity) {
      limit = orgRow.student_capacity
    }
  }

  if (limit === 'unlimited') return { allowed: true }

  let currentCount = 0
  if (limitType === 'maxStudents') {
    const { count } = orgId
      ? await supabase.from('learners').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
      : await supabase.from('learners').select('*', { count: 'exact', head: true }).eq('instructor_id', userId)
    currentCount = count ?? 0
  } else if (limitType === 'maxClasses') {
    const { count } = orgId
      ? await supabase.from('groups').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
      : await supabase.from('groups').select('*', { count: 'exact', head: true }).eq('instructor_id', userId)
    currentCount = count ?? 0
  } else if (limitType === 'maxTeachers') {
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('role', 'teacher')
    currentCount = count ?? 0
  } else if (limitType === 'maxSubjects') {
    const { count } = orgId
      ? await supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
      : await supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('instructor_id', userId)
    currentCount = count ?? 0
  } else if (limitType === 'maxCustomTemplates') {
    const { count } = orgId
      ? await supabase.from('assessment_templates').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
      : await supabase.from('assessment_templates').select('*', { count: 'exact', head: true }).eq('instructor_id', userId)
    currentCount = count ?? 0
  }

  if (currentCount >= limit) {
    return {
      allowed: false,
      message: `Your ${config.label} plan allows up to ${limit} ${limitType.replace('max', '').toLowerCase()}. Upgrade in Settings → Billing to add more.`,
    }
  }

  return { allowed: true }
}