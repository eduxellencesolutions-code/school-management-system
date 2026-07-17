import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScoreGrid from '@/components/scores/ScoreGrid'
import ScoreSelectors from '@/components/scores/ScoreSelectors'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  searchParams: Promise<{ class?: string; subject?: string }>
}

export default async function ScoresPage({ searchParams }: Props) {
  const params = await searchParams

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  const orgId = profile?.organization_id
  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'

  let groups: { id: string; name: string; code?: string | null }[] = []
  let userRole: 'admin' | 'mixed' | 'solo' = 'solo'
  let restrictedSubjectId: string | null = null
  let restrictedSubjectIds: string[] | null = null
  let canImport = false

  if (orgId && isAdmin) {
    // ✅ ADMIN: See all classes in the organization
    userRole = 'admin'
    canImport = true
    const { data } = await supabase
      .from('groups').select('id, name, code')
      .eq('organization_id', orgId).eq('is_active', true).order('name')
    groups = data ?? []
  } else if (orgId && !isAdmin) {
    // ✅ INSTITUTION TEACHER: Per-class access mapping
    const { data: assignments } = await supabase
      .from('teacher_assignments')
      .select('class_id, subject_id, role')
      .eq('teacher_id', authUser.id)

    // Build per-class access: is she class_teacher here, and/or which subjects is she assigned to
    const classAccess = new Map<string, { isClassTeacher: boolean; subjectIds: string[] }>()

    for (const a of assignments ?? []) {
      if (!a.class_id) continue
      if (!classAccess.has(a.class_id)) {
        classAccess.set(a.class_id, { isClassTeacher: false, subjectIds: [] })
      }
      const entry = classAccess.get(a.class_id)!
      if (a.role === 'class_teacher') entry.isClassTeacher = true
      if (a.role === 'subject_teacher' && a.subject_id) entry.subjectIds.push(a.subject_id)
    }

    const classIds = [...classAccess.keys()]
    const { data } = await supabase
      .from('groups').select('id, name, code')
      .in('id', classIds).eq('is_active', true).order('name')
    groups = data ?? []

    userRole = 'mixed' // determined per-class below, not globally

    if (params.class) {
      const access = classAccess.get(params.class)
      if (access?.isClassTeacher) {
        canImport = true
        restrictedSubjectId = null // sees all subjects in this class
        restrictedSubjectIds = null
      } else if (access?.subjectIds.length) {
        canImport = false
        restrictedSubjectIds = access.subjectIds // only her assigned subject(s) in this class
        restrictedSubjectId = null
      }
    }
  } else {
    // ✅ SOLO TEACHER: See only their own classes
    userRole = 'solo'
    canImport = true
    const { data } = await supabase
      .from('groups').select('id, name, code')
      .eq('instructor_id', authUser.id).eq('is_active', true).order('name')
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

  // ✅ Filter subjects based on restrictedSubjectIds or restrictedSubjectId
  let subjects
  if (restrictedSubjectIds && restrictedSubjectIds.length > 0) {
    subjects = (subjectsRaw ?? []).filter(s => restrictedSubjectIds!.includes(s.id))
  } else if (restrictedSubjectId) {
    subjects = (subjectsRaw ?? []).filter(s => s.id === restrictedSubjectId)
  } else {
    subjects = subjectsRaw
  }

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
      const { data: scoresData } = await supabase
        .from('scores')
        .select('learner_id, component_id, score')
        .eq('subject_id', selectedSubjectId)
        .in('learner_id', learners.map(l => l.id))
      existingScores = scoresData
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Score Entry</h1>
        <p className="page-subtitle">
          {userRole === 'mixed'
            ? 'Enter scores for your assigned classes and subjects'
            : userRole === 'admin'
            ? 'Select a class and subject to start entering scores'
            : 'Select a class and subject to start entering scores'}
        </p>
      </div>

      <ScoreSelectors
        groups={groups ?? []}
        subjects={subjects ?? []}
        selectedGroupId={selectedGroupId ?? ''}
        selectedSubjectId={selectedSubjectId ?? ''}
        userRole={userRole === 'mixed' ? 'class_teacher' : userRole}
        lockSubject={!!restrictedSubjectIds || !!restrictedSubjectId}
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
            canImport={canImport}
          />
        )
      ) : selectedGroupId && subjects?.length === 0 ? (
        <div className="card py-12 flex flex-col items-center text-center">
          <p className="text-sm text-ink-muted mb-3">No subjects available to you in this class.</p>
        </div>
      ) : !selectedGroupId ? (
        <div className="card py-12 flex flex-col items-center text-center text-ink-muted text-sm">
          Select a class above to begin entering scores.
        </div>
      ) : null}
    </div>
  )
}
