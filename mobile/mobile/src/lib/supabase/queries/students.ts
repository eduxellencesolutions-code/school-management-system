import { supabase } from '../client'
import { resolveAccessTier } from '../permissions'

export interface StudentListItem {
  id: string; firstName: string; lastName: string; admissionNumber: string | null
  gender: string | null; className: string | null; createdAt: string
}

export async function loadStudents(
  userId: string, role: string, orgId: string, classFilter?: string
): Promise<{ students: StudentListItem[]; tier: 'full' | 'assigned'; canManage: boolean }> {
  const tier = await resolveAccessTier(userId, role, ['students.view', 'fees.view'])
  const canManage = tier === 'full' // matches web: only non-'assigned' users see Add/Import/Delete

  let query = supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number, gender, created_at, group:groups(name)')
    .eq('is_active', true)
    .order('last_name')
    .limit(100)

  if (tier === 'full') {
    query = query.eq('organization_id', orgId)
  } else {
    const { data: assignments } = await supabase
      .from('teacher_assignments').select('class_id').eq('teacher_id', userId).not('class_id', 'is', null)
    const classIds = [...new Set((assignments ?? []).map((a) => a.class_id))]
    if (classIds.length === 0) return { students: [], tier, canManage }
    query = query.in('group_id', classIds)
  }

  if (classFilter) query = query.eq('group_id', classFilter)

  const { data, error } = await query
  if (error) throw new Error('Could not load students.')

  return {
    students: (data ?? []).map((l: any) => ({
      id: l.id, firstName: l.first_name, lastName: l.last_name, admissionNumber: l.admission_number,
      gender: l.gender, className: l.group?.name ?? null, createdAt: l.created_at,
    })),
    tier, canManage,
  }
}

export async function loadClassOptionsForFilter(userId: string, role: string, orgId: string) {
  const tier = await resolveAccessTier(userId, role, ['students.view', 'fees.view'])
  let query = supabase.from('groups').select('id, name').eq('is_active', true).order('name')
  if (tier === 'full') {
    query = query.eq('organization_id', orgId)
  } else {
    const { data: assignments } = await supabase.from('teacher_assignments').select('class_id').eq('teacher_id', userId).not('class_id', 'is', null)
    const classIds = [...new Set((assignments ?? []).map((a) => a.class_id))]
    if (classIds.length === 0) return []
    query = query.in('id', classIds)
  }
  const { data } = await query
  return data ?? []
}