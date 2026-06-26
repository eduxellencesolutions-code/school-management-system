'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { RotateCcw, Save } from 'lucide-react'

interface Grade {
  id: string
  grade_letter: string
  min_score: number
  max_score: number
  remark: string
  points?: number
}
interface Props { orgId: string; gradingSystem: Grade[] }

const DEFAULT_GRADES = [
  { grade_letter: 'A', min_score: 70, max_score: 100, remark: 'Excellent',   points: 4.0 },
  { grade_letter: 'B', min_score: 60, max_score: 69,  remark: 'Very Good',   points: 3.0 },
  { grade_letter: 'C', min_score: 50, max_score: 59,  remark: 'Good',        points: 2.0 },
  { grade_letter: 'D', min_score: 40, max_score: 49,  remark: 'Pass',        points: 1.0 },
  { grade_letter: 'E', min_score: 30, max_score: 39,  remark: 'Below Pass',  points: 0.5 },
  { grade_letter: 'F', min_score: 0,  max_score: 29,  remark: 'Fail',        points: 0.0 },
]

export default function GradingManager({ orgId, gradingSystem }: Props) {
  const supabase = createClient()
  const router   = useRouter()
  const [grades, setGrades]   = useState<Omit<Grade, 'id'>[]>(
    gradingSystem.length > 0
      ? [...gradingSystem].sort((a, b) => b.min_score - a.min_score)
      : DEFAULT_GRADES
  )
  const [loading, setLoading] = useState(false)

  function update(i: number, field: keyof Omit<Grade, 'id'>, value: string | number) {
    setGrades(prev => prev.map((g, idx) => idx === i ? { ...g, [field]: value } : g))
  }

  async function save() {
    // Validate no gaps or overlaps
    for (const g of grades) {
      if (g.min_score > g.max_score) {
        toast.error(`${g.grade_letter}: min score cannot exceed max score`)
        return
      }
    }

    setLoading(true)
    // Delete existing and re-insert
    await supabase.from('grading_systems').delete().eq('organization_id', orgId)
    const { error } = await supabase.from('grading_systems').insert(
      grades.map(g => ({ ...g, organization_id: orgId, name: 'Default', points: Number(g.points) || 0 }))
    )

    if (error) {
      toast.error('Failed to save grading system')
    } else {
      toast.success('Grading system saved')
      router.refresh()
    }
    setLoading(false)
  }

  async function resetToDefault() {
    if (!confirm('Reset to the default Nigerian grading system?')) return
    setGrades(DEFAULT_GRADES)
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm text-ink">Grading System</h2>
          <p className="text-xs text-ink-muted mt-0.5">Define grade boundaries and remarks for your institution</p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetToDefault} className="btn-ghost btn-sm btn">
            <RotateCcw size={12} /> Reset to default
          </button>
          <button onClick={save} disabled={loading} className="btn-primary btn-sm btn">
            <Save size={12} /> {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Min score (%)</th>
              <th>Max score (%)</th>
              <th>Remark</th>
              <th>GPA points</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g, i) => (
              <tr key={g.grade_letter}>
                <td>
                  <span className={`badge font-bold
                    ${g.grade_letter === 'A' ? 'badge-green' :
                      g.grade_letter === 'B' ? 'badge-blue' :
                      g.grade_letter === 'C' ? 'badge-amber' :
                      'badge-red'}`}>
                    {g.grade_letter}
                  </span>
                </td>
                <td>
                  <input
                    type="number" min={0} max={100}
                    className="input w-20 font-mono text-center"
                    value={g.min_score}
                    onChange={e => update(i, 'min_score', Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="number" min={0} max={100}
                    className="input w-20 font-mono text-center"
                    value={g.max_score}
                    onChange={e => update(i, 'max_score', Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="input w-32"
                    value={g.remark}
                    onChange={e => update(i, 'remark', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number" min={0} max={5} step={0.5}
                    className="input w-20 font-mono text-center"
                    value={g.points ?? 0}
                    onChange={e => update(i, 'points', Number(e.target.value))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-surface-200 bg-surface-50">
        <p className="text-xs text-ink-muted">
          Grade boundaries apply to overall percentage scores. GPA points are used for university-style CGPA calculation.
        </p>
      </div>
    </div>
  )
}
