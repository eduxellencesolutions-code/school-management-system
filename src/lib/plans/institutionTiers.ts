// Institution plans are hierarchical: Premium includes everything in
// Standard and Small; Standard includes everything in Small. This ordering
// is used ONLY to find the lowest institution tier that has a given feature
// enabled (for upgrade messaging) -- it is NEVER compared against Solo
// Teacher plans (free / solo_teacher_pro), which are a completely separate,
// independent product line with their own two-tier hierarchy.
export const INSTITUTION_PLAN_ORDER = ['small_school', 'standard_school', 'premium_school'] as const
export type InstitutionPlanKey = typeof INSTITUTION_PLAN_ORDER[number]

export const INSTITUTION_PLAN_LABELS: Record<InstitutionPlanKey, string> = {
  small_school: 'Small School',
  standard_school: 'Standard School',
  premium_school: 'Premium School',
}

export const SOLO_PLAN_ORDER = ['free', 'solo_teacher_pro'] as const
export type SoloPlanKey = typeof SOLO_PLAN_ORDER[number]

export const SOLO_PLAN_LABELS: Record<SoloPlanKey, string> = {
  free: 'Free',
  solo_teacher_pro: 'Solo Teacher Pro',
}