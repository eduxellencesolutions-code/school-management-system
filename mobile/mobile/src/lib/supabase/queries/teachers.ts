import { supabase } from '../client'

export interface TeacherListItem {
  id: string; name: string; email: string; role: string
  classAssignments: { className: string; role: string }[]
  subjectAssignments: { subjectName: string; className: string | null }[]
}

export async function loadTeachers(orgId: string): Promise<TeacherListItem[]> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, name, email, role,
      teacher_assignments(id, class_id, subject_id, role, groups:class_id(name), subjects:subject_id(name))
    `)
    .eq('organization_id', orgId)
    .in('role', ['teacher', 'lecturer', 'assistant', 'principal'])
    .order('name')

  if (error) throw new Error('Could not load teachers.')

  return (data ?? []).map((t: any) => {
    const assignments = Array.isArray(t.teacher_assignments) ? t.teacher_assignments : []
    return {
      id: t.id, name: t.name, email: t.email, role: t.role,
      classAssignments: assignments
        .filter((a: any) => a.role === 'class_teacher')
        .map((a: any) => ({ className: (Array.isArray(a.groups) ? a.groups[0] : a.groups)?.name ?? 'Unknown class', role: a.role })),
      subjectAssignments: assignments
        .filter((a: any) => a.role === 'subject_teacher')
        .map((a: any) => ({
          subjectName: (Array.isArray(a.subjects) ? a.subjects[0] : a.subjects)?.name ?? 'Unknown subject',
          className: (Array.isArray(a.groups) ? a.groups[0] : a.groups)?.name ?? null,
        })),
    }
  })
}

export async function removeTeacher(teacherId: string): Promise<void> {
  await supabase.from('teacher_assignments').delete().eq('teacher_id', teacherId)
  await supabase.from('groups').update({ teacher_id: null }).eq('teacher_id', teacherId)
  await supabase.from('subjects').update({ teacher_id: null }).eq('teacher_id', teacherId)
  const { error } = await supabase.from('users').delete().eq('id', teacherId)
  if (error) throw new Error('Could not remove teacher.')
}