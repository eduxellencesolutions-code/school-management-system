import { supabase } from '../client'

export interface HomeworkAssignment {
  id: string; subjectName: string | null; title: string; issuedDate: string; dueDate: string
  status: 'submitted' | 'late' | 'not_submitted'
}

export async function loadChildHomework(learnerId: string): Promise<{ assignments: HomeworkAssignment[]; featureDisabled: boolean }> {
  const { data: learner, error: learnerError } = await supabase
    .from('learners').select('id, group_id, organization_id').eq('id', learnerId).single()
  if (learnerError || !learner) throw new Error('Student not found.')
  if (!learner.group_id) return { assignments: [], featureDisabled: false }

  const { data: hasFeature } = await supabase.rpc('org_has_feature', { p_org_id: learner.organization_id, p_feature_key: 'homework' })
  if (!hasFeature) return { assignments: [], featureDisabled: true }

  const { data: assignments, error } = await supabase
    .from('homework_assignments')
    .select('id, subject_id, title, issued_date, due_date')
    .eq('group_id', learner.group_id)
    .order('due_date', { ascending: false })
  if (error) throw new Error('Could not load homework.')
  if (!assignments || assignments.length === 0) return { assignments: [], featureDisabled: false }

  const subjectIds = [...new Set(assignments.map((a) => a.subject_id))]
  const { data: subjects } = await supabase.from('subjects').select('id, name').in('id', subjectIds)
  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]))

  const assignmentIds = assignments.map((a) => a.id)
  const { data: submissions } = await supabase
    .from('homework_submissions').select('assignment_id, status').eq('learner_id', learnerId).in('assignment_id', assignmentIds)
  const submissionMap = new Map((submissions ?? []).map((s) => [s.assignment_id, s.status]))

  return {
    featureDisabled: false,
    assignments: assignments.map((a) => ({
      id: a.id, subjectName: subjectMap.get(a.subject_id) ?? null, title: a.title,
      issuedDate: a.issued_date, dueDate: a.due_date,
      status: (submissionMap.get(a.id) as HomeworkAssignment['status']) ?? 'not_submitted',
    })),
  }
}