import { PlanKey, getPlanConfig } from './config'

// Explicit hierarchy — index position = rank. Higher index = higher tier.
const PLAN_RANK: PlanKey[] = ['free', 'small_school', 'standard_school', 'premium_school']
const SOLO_PLAN_RANK: PlanKey[] = ['free', 'solo_teacher_pro']

function getRankList(currentPlan: PlanKey, isInstitution: boolean): PlanKey[] {
  // If it's an institution, use institution hierarchy
  if (isInstitution) return PLAN_RANK
  // For solo teachers, use solo hierarchy
  return SOLO_PLAN_RANK
}

export function getUpgradeOptions(currentPlan: PlanKey, isInstitution: boolean): PlanKey[] {
  const list = getRankList(currentPlan, isInstitution)
  const idx = list.indexOf(currentPlan)
  return list.slice(idx + 1)
}

export function getDowngradeOptions(currentPlan: PlanKey, isInstitution: boolean): PlanKey[] {
  const list = getRankList(currentPlan, isInstitution)
  const idx = list.indexOf(currentPlan)
  
  // ✅ FIXED: Get all plans BEFORE the current plan (lower tiers)
  // For solo_teacher_pro: ['free'] → returns ['free']
  // For premium_school: ['free', 'small_school', 'standard_school'] → returns all lower tiers
  return list.slice(0, idx)
}

export interface UsageCheck {
  label: string
  current: number
  limit: number | 'unlimited'
  overLimit: boolean
}

export function checkDowngradeEligibility(
  targetPlan: PlanKey,
  usage: { students: number; teachers: number; classes: number }
): { eligible: boolean; checks: UsageCheck[] } {
  const config = getPlanConfig(targetPlan)
  const checks: UsageCheck[] = [
    { label: 'Students', current: usage.students, limit: config.limits.maxStudents, overLimit: usage.students > config.limits.maxStudents },
    { label: 'Teachers', current: usage.teachers, limit: config.limits.maxTeachers, overLimit: usage.teachers > config.limits.maxTeachers },
    {
      label: 'Classes',
      current: usage.classes,
      limit: config.limits.maxClasses,
      overLimit: config.limits.maxClasses !== 'unlimited' && usage.classes > config.limits.maxClasses,
    },
  ]
  return { eligible: checks.every(c => !c.overLimit), checks }
}
