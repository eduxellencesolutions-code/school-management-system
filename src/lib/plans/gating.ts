import { createClient } from '@supabase/supabase-js'
import { getPlanConfig, PlanConfig } from './config'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// An "account" is either an institution (organization_id) or
// a solo teacher (userId, organization_id is null).
export type AccountRef =
  | { type: 'org'; orgId: string }
  | { type: 'solo'; userId: string }

interface UsageCounts {
  students: number
  teachers: number
  admins: number
  academicSessions: number
  classes: number
  subjects: number
}

export async function getUsageCounts(ref: AccountRef): Promise<UsageCounts> {
  const admin = serviceClient()

  if (ref.type === 'org') {
    const [
      { count: students },
      { count: teachers },
      { count: admins },
      { count: academicSessions },
      { count: classes },
      { count: subjects },
    ] = await Promise.all([
      admin.from('learners').select('id', { count: 'exact', head: true }).eq('organization_id', ref.orgId),
      admin.from('users').select('id', { count: 'exact', head: true }).eq('organization_id', ref.orgId).eq('role', 'teacher'),
      admin.from('users').select('id', { count: 'exact', head: true }).eq('organization_id', ref.orgId).eq('role', 'admin'),
      admin.from('academic_sessions').select('id', { count: 'exact', head: true }).eq('organization_id', ref.orgId),
      admin.from('groups').select('id', { count: 'exact', head: true }).eq('organization_id', ref.orgId),
      admin.from('subjects').select('id', { count: 'exact', head: true }).eq('organization_id', ref.orgId),
    ])

    return {
      students: students ?? 0,
      teachers: teachers ?? 0,
      admins: admins ?? 0,
      academicSessions: academicSessions ?? 0,
      classes: classes ?? 0,
      subjects: subjects ?? 0,
    }
  }

  // Solo teacher: subjects/academic_sessions/groups are scoped directly
  // by instructor_id. learners has no instructor_id column, so it must
  // be counted via a join through groups (a student belongs to a group,
  // and a group belongs to the teacher).
  const [
    { count: academicSessions },
    { data: teacherGroups },
    { count: subjects },
  ] = await Promise.all([
    admin.from('academic_sessions').select('id', { count: 'exact', head: true }).eq('instructor_id', ref.userId),
    admin.from('groups').select('id').eq('instructor_id', ref.userId),
    admin.from('subjects').select('id', { count: 'exact', head: true }).eq('instructor_id', ref.userId),
  ])

  const groupIds = (teacherGroups ?? []).map(g => g.id)

  const { count: students } = groupIds.length > 0
    ? await admin.from('learners').select('id', { count: 'exact', head: true }).in('group_id', groupIds)
    : { count: 0 }

  return {
    students: students ?? 0,
    teachers: 1, // Solo teacher counts as their own teacher
    admins: 1, // Solo teacher counts as their own admin
    academicSessions: academicSessions ?? 0,
    classes: groupIds.length,
    subjects: subjects ?? 0,
  }
}

function checkLimit(current: number, max: number | 'unlimited'): boolean {
  if (max === 'unlimited') return true
  return current < max
}

export interface GateResult {
  allowed: boolean
  reason?: string
}

export async function canAddStudent(plan: string, ref: AccountRef): Promise<GateResult> {
  const config = getPlanConfig(plan)
  const usage = await getUsageCounts(ref)

  // Solo teachers on the free plan get a lower cap (10) than institutions on the same plan (30)
  const maxStudents = (plan === 'free' && ref.type === 'solo') ? 10 : config.limits.maxStudents

  const allowed = checkLimit(usage.students, maxStudents)
  return allowed
    ? { allowed: true }
    : { allowed: false, reason: `Student limit reached (${maxStudents} max on ${config.label} plan). Upgrade to add more students.` }
}

export async function canAddTeacher(plan: string, ref: AccountRef): Promise<GateResult> {
  const config = getPlanConfig(plan)
  if (!config.features.teacherManagement) {
    return { allowed: false, reason: `Teacher management is not available on the ${config.label} plan.` }
  }
  const usage = await getUsageCounts(ref)
  const allowed = checkLimit(usage.teachers, config.limits.maxTeachers)
  return allowed
    ? { allowed: true }
    : { allowed: false, reason: `Teacher limit reached (${config.limits.maxTeachers} max on ${config.label} plan).` }
}

export async function canAddAdmin(plan: string, ref: AccountRef): Promise<GateResult> {
  const config = getPlanConfig(plan)
  const usage = await getUsageCounts(ref)
  const allowed = checkLimit(usage.admins, config.limits.maxAdmins)
  return allowed
    ? { allowed: true }
    : { allowed: false, reason: `Administrator limit reached (${config.limits.maxAdmins} max on ${config.label} plan).` }
}

export async function canCreateAcademicSession(plan: string, ref: AccountRef): Promise<GateResult> {
  const config = getPlanConfig(plan)
  const usage = await getUsageCounts(ref)
  const allowed = checkLimit(usage.academicSessions, config.limits.maxAcademicSessions)
  return allowed
    ? { allowed: true }
    : { allowed: false, reason: `Academic session limit reached on the ${config.label} plan. Upgrade for unlimited sessions.` }
}

export async function canCreateClass(plan: string, ref: AccountRef): Promise<GateResult> {
  const config = getPlanConfig(plan)
  const usage = await getUsageCounts(ref)
  const allowed = checkLimit(usage.classes, config.limits.maxClasses)
  return allowed
    ? { allowed: true }
    : { allowed: false, reason: `Class limit reached on the ${config.label} plan. Upgrade for unlimited classes.` }
}

// ✅ NEW: Subject creation gate
export async function canCreateSubject(plan: string, ref: AccountRef): Promise<GateResult> {
  const config = getPlanConfig(plan)
  const usage = await getUsageCounts(ref)
  const allowed = checkLimit(usage.subjects, config.limits.maxSubjects)
  return allowed
    ? { allowed: true }
    : { allowed: false, reason: `Subject limit reached (${config.limits.maxSubjects} max on ${config.label} plan). Upgrade for unlimited subjects.` }
}

// Simple boolean feature check — for things like broadsheet
// generation, portals, AI remarks, etc.
export function hasFeature<K extends keyof PlanConfig['features']>(
  plan: string,
  feature: K
): boolean {
  const config = getPlanConfig(plan)
  const value = config.features[feature]
  return typeof value === 'boolean' ? value : true // non-boolean features (tiered strings) are "available" at some level
}

export function getApprovalWorkflow(plan: string) {
  return getPlanConfig(plan).features.resultApprovalWorkflow
}

export function getAuditLogLevel(plan: string) {
  return getPlanConfig(plan).features.auditLogs
}

export function getSupportLevel(plan: string) {
  return getPlanConfig(plan).features.prioritySupport
}