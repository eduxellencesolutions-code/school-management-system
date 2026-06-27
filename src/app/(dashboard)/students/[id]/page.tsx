import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import StudentEditForm from '@/components/students/StudentEditForm'
import StudentScoreHistory from '@/components/students/StudentScoreHistory'

interface Props { params: { id: string } }

export default async function StudentDetailPage({ params }: Props) {
  // ✅ FIX: Add await here
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: learner } = await supabase
    .from('learners')
    .select(`
      *,
      group:groups(id, name, code),
      organization:organizations(name)
    `)
    .eq('id', params.id)
    .single()

  if (!learner) notFound()

  // Fetch score summary for this student
  const { data: scoresData } = await supabase
    .from('scores')
    .select(`
      score, entered_at,
      subject:subjects(name),
      component:assessment_components(name, max_score)
    `)
    .eq('learner_id', params.id)
    .order('entered_at', { ascending: false })
    .limit(50)

  // FIX: Transform scores to match ScoreEntry type
  const scores = scoresData?.map((score: any) => ({
    score: score.score,
    entered_at: score.entered_at,
    subject: score.subject?.[0] || null,      // Extract first subject or null
    component: score.component?.[0] || null,  // Extract first component or null
  })) ?? []

  const group = learner.group as { id: string; name: string; code?: string } | null

  // Calculate average score
  const validScores = scores.filter(s => s.score !== null && s.score !== undefined)
  const avgScore = validScores.length > 0
    ? (validScores.reduce((a, b) => a + (b.score || 0), 0) / validScores.length).toFixed(1)
    : '—'

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/students" className="text-ink-muted hover:text-ink">Students</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">{learner.last_name} {learner.first_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 text-xl font-bold flex items-center justify-center shrink-0">
          {learner.first_name[0]}{learner.last_name[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-ink">
            {learner.last_name} {learner.first_name}
            {learner.other_names ? ` ${learner.other_names}` : ''}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {learner.admission_number && (
              <span className="badge badge-gray font-mono">{learner.admission_number}</span>
            )}
            {group && (
              <span className="badge badge-blue">{group.name}</span>
            )}
            {learner.gender && (
              <span className={`badge ${learner.gender === 'M' ? 'badge-blue' : 'badge-amber'}`}>
                {learner.gender === 'M' ? 'Male' : learner.gender === 'F' ? 'Female' : 'Other'}
              </span>
            )}
            <span className={`badge ${learner.is_active ? 'badge-green' : 'badge-gray'}`}>
              {learner.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <Link
          href={`/scores?class=${group?.id}&student=${learner.id}`}
          className="btn-primary btn-sm btn shrink-0"
        >
          Enter scores
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-value">{scores.length}</div>
          <div className="stat-label">Score entries</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgScore}</div>
          <div className="stat-label">Avg score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {learner.enrollment_date ? formatDate(learner.enrollment_date) : '—'}
          </div>
          <div className="stat-label">Enrolled</div>
        </div>
      </div>

      {/* Edit form */}
      <StudentEditForm learner={learner} groups={[group].filter(Boolean) as { id: string; name: string }[]} />

      {/* Score history */}
      <StudentScoreHistory scores={scores} />
    </div>
  )
}