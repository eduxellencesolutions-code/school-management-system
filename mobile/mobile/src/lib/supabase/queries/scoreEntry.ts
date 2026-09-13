import { supabase } from '../client'
import { resolveAccessTier } from '../permissions'

export interface ScoreEntryGroup { id: string; name: string; code: string | null }
export interface ScoreEntrySubject { id: string; name: string; code: string | null; templateId: string | null }
export interface ScoreComponent { id: string; name: string; maxScore: number; sequence: number }
export interface ScoreLearner { id: string; firstName: string; lastName: string; admissionNumber: string | null }
export interface ExistingScore { learnerId: string; componentId: string; score: number | null }

export async function loadGroupsForScoreEntry(
  userId: string,
  orgId: string,
  role: string
): Promise<{ groups: ScoreEntryGroup[]; tier: 'full' | 'assigned' }> {
  const tier = await resolveAccessTier(userId, role, []) // score entry has no view-only bypass permission in the web code — only admin sees all classes

  if (tier === 'full') {
    const { data, error } = await supabase
      .from('groups').select('id, name, code')
      .eq('organization_id', orgId).eq('is_active', true).order('name')
    if (error) throw new Error('Could not load classes.')
    return { groups: data ?? [], tier }
  }

  const { data: assignments, error } = await supabase
    .from('teacher_assignments')
    .select('class_id')
    .eq('teacher_id', userId)
    .not('class_id', 'is', null)
  if (error) throw new Error('Could not load your class assignments.')

  const classIds = [...new Set((assignments ?? []).map((a) => a.class_id))]
  if (classIds.length === 0) return { groups: [], tier }

  const { data, error: groupsError } = await supabase
    .from('groups').select('id, name, code')
    .in('id', classIds).eq('is_active', true).order('name')
  if (groupsError) throw new Error('Could not load your classes.')
  return { groups: data ?? [], tier }
}

// Returns subjects a teacher may enter scores for in this specific class,
// and whether they can freely pick any subject (class teacher / admin) or
// are locked to their own assignment(s) — mirrors ScoreSelectors.tsx exactly.
export async function loadSubjectsForScoreEntry(
  userId: string,
  role: string,
  groupId: string
): Promise<{ subjects: ScoreEntrySubject[]; locked: boolean }> {
  const { data: subjectsRaw, error } = await supabase
    .from('subjects')
    .select('id, name, code, template_id')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error('Could not load subjects for this class.')

  const allSubjects = (subjectsRaw ?? []).map((s) => ({
    id: s.id, name: s.name, code: s.code, templateId: s.template_id,
  }))

  if (isAdminRoleLocal(role)) return { subjects: allSubjects, locked: false }

  const { data: assignments } = await supabase
    .from('teacher_assignments')
    .select('class_id, subject_id, role')
    .eq('teacher_id', userId)

  const forThisClass = (assignments ?? []).filter((a) => a.class_id === groupId)
  const isClassTeacher = forThisClass.some((a) => a.role === 'class_teacher')
  if (isClassTeacher) return { subjects: allSubjects, locked: false }

  const restrictedIds = forThisClass.filter((a) => a.role === 'subject_teacher').map((a) => a.subject_id)
  return { subjects: allSubjects.filter((s) => restrictedIds.includes(s.id)), locked: true }
}

function isAdminRoleLocal(role: string) {
  return role === 'admin' || role === 'school_admin'
}

export async function loadScoreGridData(groupId: string, subjectId: string) {
  const [learnersRes, subjectRes] = await Promise.all([
    supabase.from('learners').select('id, first_name, last_name, admission_number')
      .eq('group_id', groupId).eq('is_active', true).order('last_name'),
    supabase.from('subjects').select('id, name, code, template_id').eq('id', subjectId).single(),
  ])
  if (learnersRes.error) throw new Error('Could not load students.')
  if (subjectRes.error) throw new Error('Could not load subject details.')

  const learners: ScoreLearner[] = (learnersRes.data ?? []).map((l) => ({
    id: l.id, firstName: l.first_name, lastName: l.last_name, admissionNumber: l.admission_number,
  }))

  let components: ScoreComponent[] = []
  if (subjectRes.data.template_id) {
    const { data: comps, error } = await supabase
      .from('assessment_components')
      .select('id, name, max_score, sequence')
      .eq('template_id', subjectRes.data.template_id)
      .order('sequence')
    if (error) throw new Error('Could not load assessment components.')
    components = (comps ?? []).map((c) => ({ id: c.id, name: c.name, maxScore: c.max_score, sequence: c.sequence }))
  }

  let existingScores: ExistingScore[] = []
  if (learners.length > 0 && components.length > 0) {
    const { data: scoresData, error } = await supabase
      .from('scores')
      .select('learner_id, component_id, score')
      .eq('subject_id', subjectId)
      .in('learner_id', learners.map((l) => l.id))
    if (error) throw new Error('Could not load existing scores.')
    existingScores = (scoresData ?? []).map((s) => ({ learnerId: s.learner_id, componentId: s.component_id, score: s.score }))
  }

  return { learners, components, existingScores, subjectName: subjectRes.data.name, subjectCode: subjectRes.data.code }
}

export async function saveScore(params: {
  learnerId: string
  subjectId: string
  componentId: string
  score: number | null
  enteredBy: string
}): Promise<void> {
  const { error } = await supabase.from('scores').upsert(
    {
      learner_id: params.learnerId,
      subject_id: params.subjectId,
      component_id: params.componentId,
      score: params.score,
      entered_by: params.enteredBy,
    },
    { onConflict: 'learner_id,subject_id,component_id' }
  )
  if (error) throw new Error('Could not save score.')
}