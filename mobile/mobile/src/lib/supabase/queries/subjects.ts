import { supabase } from '../client'

export interface SubjectListItem {
  id: string; name: string; code: string | null; groupId: string | null
  className: string; templateName: string | null
}

export async function loadSubjects(userId: string, role: string, orgId: string): Promise<{ subjectsByClass: Record<string, SubjectListItem[]>; tier: 'full' | 'assigned' }> {
  const isAdmin = role === 'admin' || role === 'school_admin'

  let subjectsQuery = supabase.from('subjects').select('id, name, code, group_id, template_id').eq('is_active', true).order('name')
  let groupsQuery = supabase.from('groups').select('id, name').eq('is_active', true)
  let templatesQuery = supabase.from('assessment_templates').select('id, name')

  if (isAdmin) {
    subjectsQuery = subjectsQuery.eq('organization_id', orgId)
    groupsQuery = groupsQuery.eq('organization_id', orgId)
    templatesQuery = templatesQuery.eq('organization_id', orgId)
  } else {
    const { data: assignments } = await supabase.from('teacher_assignments').select('class_id, subject_id').eq('teacher_id', userId)
    const classIds = [...new Set((assignments ?? []).map((a) => a.class_id).filter(Boolean))]
    const subjectIds = [...new Set((assignments ?? []).map((a) => a.subject_id).filter(Boolean))]
    if (classIds.length === 0 && subjectIds.length === 0) return { subjectsByClass: {}, tier: 'assigned' }
    subjectsQuery = subjectIds.length > 0 ? subjectsQuery.in('id', subjectIds) : subjectsQuery.in('group_id', classIds)
    groupsQuery = groupsQuery.in('id', classIds)
    templatesQuery = templatesQuery.eq('organization_id', orgId)
  }

  const [{ data: subjects, error }, { data: groups }, { data: templates }] = await Promise.all([subjectsQuery, groupsQuery, templatesQuery])
  if (error) throw new Error('Could not load subjects.')

  const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]))
  const templateNameById = new Map((templates ?? []).map((t) => [t.id, t.name]))

  const byClass: Record<string, SubjectListItem[]> = {}
  for (const s of subjects ?? []) {
    const groupKey = s.group_id ?? 'ungrouped'
    if (!byClass[groupKey]) byClass[groupKey] = []
    byClass[groupKey].push({
      id: s.id, name: s.name, code: s.code, groupId: s.group_id,
      className: groupNameById.get(s.group_id ?? '') ?? 'Ungrouped',
      templateName: s.template_id ? (templateNameById.get(s.template_id) ?? 'Unknown template') : null,
    })
  }
  return { subjectsByClass: byClass, tier: isAdmin ? 'full' : 'assigned' }
}