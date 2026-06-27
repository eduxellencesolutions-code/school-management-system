import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScoreGrid from '@/components/scores/ScoreGrid'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

interface Props {
  searchParams: { class?: string; subject?: string }
}

export default async function ScoresPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  const orgId = profile?.organization_id

  // Fetch all groups for the selector
  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, code')
    .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
    .eq('is_active', true)
    .order('name')

  const selectedGroupId = searchParams.class
  const selectedSubjectId = searchParams.subject

  // Fetch subjects for selected class
  const { data: subjects } = selectedGroupId
    ? await supabase
        .from('subjects')
        .select('id, name, code, template_id')
        .eq('group_id', selectedGroupId)
        .eq('is_active', true)
        .order('name')
    : { data: null }

  // Full data for ScoreGrid
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

      {/* Selectors */}
      <div className="card p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Class</label>
          <select
            defaultValue={selectedGroupId ?? ''}
            onChange={(e) => {
              const url = new URL(window.location.href)
              url.searchParams.set('class', e.target.value)
              url.searchParams.delete('subject')
              window.location.href = url.toString()
            }}
            className="input"
          >
            <option value="">Select class…</option>
            {groups?.map(g => (
              <option key={g.id} value={g.id}>{g.name}{g.code ? ` (${g.code})` : ''}</option>
            ))}
          </select>
        </div>

        {selectedGroupId && subjects && subjects.length > 0 && (
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Subject</label>
            <select
              defaultValue={selectedSubjectId ?? ''}
              onChange={(e) => {
                const url = new URL(window.location.href)
                url.searchParams.set('subject', e.target.value)
                window.location.href = url.toString()
              }}
              className="input"
            >
              <option value="">Select subject…</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {selectedGroupId && (
          <Link href={`/classes/${selectedGroupId}`} className="btn-secondary btn-sm btn mb-px">
            Manage class →
          </Link>
        )}
      </div>

      {/* Score grid */}
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
