'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Users, Award, Target } from 'lucide-react'
import { DEFAULT_GRADING } from '@/lib/utils'

interface Props { groupId: string; totalStudents: number }

interface SubjectAvg { subject: string; average: number }

export default function ClassStats({ groupId, totalStudents }: Props) {
  const supabase = createClient()
  const [stats, setStats] = useState<{
    classAverage: number | null
    passRate: number | null
    subjectAverages: SubjectAvg[]
    gradeDistribution: Record<string, number>
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Fetch all scores for the group via learners
      const { data: learners } = await supabase
        .from('learners')
        .select('id')
        .eq('group_id', groupId)
        .eq('is_active', true)

      if (!learners?.length) { setLoading(false); return }

      const { data: scores } = await supabase
        .from('scores')
        .select('score, learner_id, subject:subjects(name, group_id)')
        .in('learner_id', learners.map(l => l.id))

      if (!scores?.length) { setLoading(false); return }

      // FIX: Filter to only this group's subjects
      // Handle subject as array or single object
      const groupScores = scores.filter(s => {
        // If subject is an array, check the first item's group_id
        if (Array.isArray(s.subject)) {
          return s.subject[0]?.group_id === groupId
        }
        // If subject is a single object
        return (s.subject as any)?.group_id === groupId
      })

      // Subject averages
      const bySubject = groupScores.reduce<Record<string, number[]>>((acc, s) => {
        // Get subject name from array or single object
        let name = 'Unknown'
        if (Array.isArray(s.subject)) {
          name = s.subject[0]?.name || 'Unknown'
        } else if (s.subject) {
          name = (s.subject as any)?.name || 'Unknown'
        }
        if (!acc[name]) acc[name] = []
        if (s.score !== null) acc[name].push(s.score)
        return acc
      }, {})

      const subjectAverages = Object.entries(bySubject).map(([subject, vals]) => ({
        subject,
        average: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0,
      })).sort((a, b) => b.average - a.average)

      // Per-student totals for class average
      const byLearner = groupScores.reduce<Record<string, number[]>>((acc, s) => {
        if (!acc[s.learner_id]) acc[s.learner_id] = []
        if (s.score !== null) acc[s.learner_id].push(s.score)
        return acc
      }, {})

      const learnerAvgs = Object.values(byLearner).map(vals =>
        vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
      )

      const classAverage = learnerAvgs.length > 0
        ? learnerAvgs.reduce((a, b) => a + b, 0) / learnerAvgs.length
        : null

      const passRate = learnerAvgs.length > 0
        ? (learnerAvgs.filter(a => a >= 40).length / learnerAvgs.length) * 100
        : null

      // Grade distribution
      const gradeDistribution: Record<string, number> = {}
      for (const avg of learnerAvgs) {
        const grade = DEFAULT_GRADING.find(g => avg >= g.min_score && avg <= g.max_score)
        const letter = grade?.grade_letter ?? 'F'
        gradeDistribution[letter] = (gradeDistribution[letter] ?? 0) + 1
      }

      setStats({ classAverage, passRate, subjectAverages, gradeDistribution })
      setLoading(false)
    }

    load()
  }, [groupId, supabase])

  if (loading) {
    return (
      <div className="card p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-surface-200 rounded w-1/3" />
          <div className="h-8 bg-surface-100 rounded" />
          <div className="h-8 bg-surface-100 rounded" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="card p-5 text-center">
        <TrendingUp size={28} className="text-surface-200 mx-auto mb-2" />
        <p className="text-sm text-ink-muted">No scores yet — analytics will appear here once scores are entered</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-sm text-ink">Class analytics</h2>
      </div>
      <div className="card-body flex flex-col gap-5">
        {/* Key numbers */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-brand-50 rounded p-3">
            <p className="text-xs text-brand-600 font-semibold uppercase tracking-wider mb-1">Class avg</p>
            <p className="text-2xl font-bold text-brand-700">
              {stats.classAverage !== null ? `${stats.classAverage.toFixed(1)}%` : '—'}
            </p>
          </div>
          <div className="bg-green-50 rounded p-3">
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">Pass rate</p>
            <p className="text-2xl font-bold text-green-700">
              {stats.passRate !== null ? `${stats.passRate.toFixed(0)}%` : '—'}
            </p>
          </div>
        </div>

        {/* Subject averages */}
        {stats.subjectAverages.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Subject averages</p>
            <div className="flex flex-col gap-2">
              {stats.subjectAverages.slice(0, 8).map(({ subject, average }) => (
                <div key={subject}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-ink truncate max-w-[60%]">{subject}</span>
                    <span className={`text-xs font-semibold font-mono
                      ${average >= 70 ? 'text-green-600' : average >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {average.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        average >= 70 ? 'bg-green-400' : average >= 50 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(average, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grade distribution */}
        {Object.keys(stats.gradeDistribution).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Grade distribution</p>
            <div className="flex gap-2 flex-wrap">
              {['A', 'B', 'C', 'D', 'E', 'F'].map(letter => {
                const count = stats.gradeDistribution[letter] ?? 0
                const pct = totalStudents > 0 ? (count / totalStudents) * 100 : 0
                return (
                  <div key={letter} className={`flex-1 min-w-[40px] rounded p-2 text-center
                    ${letter === 'A' ? 'bg-green-50 text-green-700' :
                      letter === 'B' ? 'bg-brand-50 text-brand-700' :
                      letter === 'C' ? 'bg-amber-50 text-amber-700' :
                      letter === 'D' ? 'bg-orange-50 text-orange-700' :
                      'bg-red-50 text-red-700'}`}>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-[10px] font-semibold">{letter}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}