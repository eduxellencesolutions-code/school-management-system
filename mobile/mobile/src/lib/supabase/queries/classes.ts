import { supabase } from '../client'

export interface ClassListItem {
  id: string; name: string; code: string | null; learnerCount: number; subjectCount: number
  teacherName: string | null; sessionName: string | null; termName: string | null
}

export async function loadClasses(userId: string, role: string, orgId: string): Promise<{ classes: ClassListItem[]; tier: 'full' | 'assigned' }> {
  const isAdmin = role === 'admin' || role === 'school_admin'

  const baseSelect = `
    id, name, code, instructor_id,
    session:academic_sessions(name), term:terms(name),
    learner_count:learners(count), subject_count:subjects(count)
  `

  let query = supabase.from('groups').select(baseSelect).eq('is_active', true).order('created_at', { ascending: false })

  if (isAdmin) {
    query = query.eq('organization_id', orgId)
  } else {
    const { data: assignments } = await supabase.from('teacher_assignments').select('class_id').eq('teacher_id', userId).not('class_id', 'is', null)
    const classIds = [...new Set((assignments ?? []).map((a) => a.class_id))]
    if (classIds.length === 0) return { classes: [], tier: 'assigned' }
    query = query.in('id', classIds)
  }

  const { data: groups, error } = await query
  if (error) throw new Error('Could not load classes.')

  const classIds = (groups ?? []).map((g: any) => g.id)
  const { data: classTeacherAssignments } = classIds.length
    ? await supabase.from('teacher_assignments').select('class_id, teacher:users!teacher_assignments_teacher_id_fkey(name)').in('class_id', classIds).eq('role', 'class_teacher')
    : { data: [] }
  const teacherByClass = new Map((classTeacherAssignments ?? []).map((a: any) => [a.class_id, a.teacher?.name ?? null]))

  return {
    tier: isAdmin ? 'full' : 'assigned',
    classes: (groups ?? []).map((g: any) => ({
      id: g.id, name: g.name, code: g.code,
      learnerCount: g.learner_count?.[0]?.count ?? 0,
      subjectCount: g.subject_count?.[0]?.count ?? 0,
      teacherName: teacherByClass.get(g.id) ?? null,
      sessionName: g.session?.name ?? null, termName: g.term?.name ?? null,
    })),
  }
}