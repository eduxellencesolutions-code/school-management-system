import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScoreGrid from '@/components/scores/ScoreGrid'
import ScoreSelectors from '@/components/scores/ScoreSelectors'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

interface Props {
  searchParams: Promise<{ class?: string; subject?: string }>
}

export default async function ScoresPage({ searchParams }: Props) {
  const params = await searchParams
  
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  // ✅ Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()
  
  const orgId = profile?.organization_id
  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'

  // ✅ Three-way role scoping
  let groups: { id: string; name: string; code: string }[] = []
  let userRole: 'admin' | 'class_teacher' | 'subject_teacher' | 'solo' = 'solo'
  let restrictedSubjectId: string | null = null

  if (orgId && isAdmin) {
    // ✅ ADMIN: See all classes in the organization
    userRole = 'admin'
    const { data } = await supabase
      .from('groups')
      .select('id, name, code')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name')
    groups = data ?? []
  } else if (orgId && !isAdmin) {
    // ✅ INSTITUTION TEACHER: See only assigned classes/subjects
    const { data: assignments } = await supabase
      .from('teacher_assignments')
      .select('class_id, subject_id, role')
      .eq('teacher_id', authUser.id)

    const classTeacherOf = assignments?.filter(a => a.role === 'class_teacher').map(a => a.class_id) ?? []
    const subjectTeacherOf = assignments?.filter(a => a.role === 'subject_teacher') ?? []

    if (classTeacherOf.length > 0) {
      // ✅ CLASS TEACHER: See their class(es) with all subjects
      userRole = 'class_teacher'
      const { data } = await supabase
        .from('groups')
        .select('id, name, code')
        .in('id', classTeacherOf)
        .eq('is_active', true)
        .order('name')
      groups = data ?? []
    } else if (subjectTeacherOf.length > 0) {
      // ✅ SUBJECT TEACHER: See their class(es) + only their subject
      userRole = 'subject_teacher'
      const classIds = [...new Set(subjectTeacherOf.map(a => a.class_id).filter(Boolean))]
      const { data } = await supabase
        .from('groups')
        .select('id, name, code')
        .in('id', classIds)
        .eq('is_active', true)
        .order('name')
      groups = data ?? []
      // A subject teacher only ever sees/submits their own subject
      if (subjectTeacherOf.length === 1) restrictedSubjectId = subjectTeacherOf[0].subject_id
    }
  } else {
    // ✅ SOLO TEACHER: See only their own classes
    userRole = 'solo'
    const { data } = await supabase
      .from('groups')
      .select('id, name, code')
      .eq('instructor_id', authUser.id)
      .eq('is_active', true)
      .order('name')
    groups = data ?? []
  }

  const selectedGroupId = params.class
  const selectedSubjectId = restrictedSubjectId ?? params.subject

  // ✅ Fetch subjects for the selected class
  const { data: subjectsRaw } = selectedGroupId
    ? await supabase
        .from('subjects')
        .select('id, name, code, template_id')
        .eq('group_id', selectedGroupId)
        .eq('is_active', true)
        .order('name')
    : { data: null }

  // ✅ Subject teachers only ever see their own subject in the dropdown
  const subjects = userRole === 'subject_teacher' && restrictedSubjectId
    ? (subjectsRaw ?? []).filter(s => s.id === restrictedSubjectId)
    : subjectsRaw

  let learners = null
  let components = null
  let existingScores = null
  let selectedSubject = null

  if (selectedGroupId && selectedSubjectId) {
    const [learnersRes, subjectRes] = await Promise.all([
      supabase
        .from('learners')
        .select('id, first_name, last_name, admission_number')
        .eq('group_id', selectedGroupId)
        .eq('is_active', true)
        .order('last_name'),
      supabase
        .from('subjects')
        .select('id, name, code, template_id')
        .eq('id', selectedSubjectId)
        .single(),
    ])

    learners = learnersRes.data
    selectedSubject = subjectRes.data

    if (selectedSubject?.template_id) {
      const { data: comps } = await supabase
        .from('assessment_components')
        .select('id, name, max_score, sequence')
        .eq('template_id', selectedSubject.template_id)
        .order('sequence')
      components = comps
    }

    if (learners && components) {
      const { data: scores } = await supabase
        .from('scores')
        .select('learner_id, component_id, score')
        .eq('subject_id', selectedSubjectId)
        .in('learner_id', learners.map(l => l.id))
      existingScores = scores
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Score Entry</h1>
        <p className="page-subtitle">Select a class and subject to start entering scores</p>
      </div>

      {/* ✅ Move window-dependent selectors to client component */}
      <ScoreSelectors
        groups={groups ?? []}
        subjects={subjects ?? []}
        selectedGroupId={selectedGroupId ?? ''}
        selectedSubjectId={selectedSubjectId ?? ''}
        userRole={userRole}
      />

      {selectedGroupId && selectedSubjectId && learners && components && selectedSubject && existingScores ? (
        learners.length === 0 ? (
          <div className="card py-12 flex flex-col items-center text-center">
            <BookOpen size={32} className="text-surface-200 mb-3" />
            <p className="text-sm text-ink-muted mb-3">No students enrolled in this class yet.</p>
            <Link href={`/students/new?class=${selectedGroupId}`} className="btn-primary btn-sm btn">
              Enrol students
            </Link>
          </div>
        ) : (
          <ScoreGrid
            key={`${selectedGroupId}-${selectedSubjectId}`}
            groupId={selectedGroupId}
            subjectId={selectedSubjectId}
            subject={selectedSubject}
            learners={learners}
            components={components}
            existingScores={existingScores}
          />
        )
      ) : selectedGroupId && subjects?.length === 0 ? (
        <div className="card py-12 flex flex-col items-center text-center">
          <p className="text-sm text-ink-muted mb-3">No subjects added to this class.</p>
          <Link href={`/classes/${selectedGroupId}`} className="btn-primary btn-sm btn">
            Add subjects
          </Link>
        </div>
      ) : !selectedGroupId ? (
        <div className="card py-12 flex flex-col items-center text-center text-ink-muted text-sm">
          Select a class above to begin entering scores.
        </div>
      ) : null}
    </div>
  )
}
