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

  // For tertiary/university orgs: max_students in tertiary_pricing_tiers is
  // a PRICING TIER BOUNDARY (which per-student rate applies), not a hard
  // admission/activation ceiling. No existing function in this codebase
  // (set_tertiary_plan, get_tertiary_billing_estimate) ever treats it as a
  // cap — billing simply counts the real student total and rates it. This
  // function must not invent enforcement the architecture doesn't establish.
  // Always allowed for tertiary; billing continues to reflect true headcount
  // regardless of tier boundaries.
  if (orgId) {
    const { data: orgRow } = await supabase.from('organizations').select('type').eq('id', orgId).single()
    if (orgRow?.type === 'university') {
      return { allowed: true }
    }
  }

  // ── Everything below this line is UNCHANGED existing school logic ──
  const plan = orgId
    ? (await supabase.from('organizations').select('subscription_plan').eq('id', orgId).single()).data?.subscription_plan
    : profile?.subscription_plan

  const config = getPlanConfig(plan ?? 'free')
  let limit = config.limits[limitType]

  if (limitType === 'maxStudents' && plan === 'free' && !orgId) {
    limit = 10
  }

  if (limitType === 'maxStudents' && plan === 'premium_school' && orgId) {
    const { data: orgRow2 } = await supabase.from('organizations').select('student_capacity').eq('id', orgId).single()
    if (orgRow2?.student_capacity) {
      limit = orgRow2.student_capacity
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