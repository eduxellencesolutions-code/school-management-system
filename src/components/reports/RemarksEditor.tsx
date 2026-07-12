'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { saveStudentRemarks } from '@/app/reports/[id]/actions'
import { Save, Loader2 } from 'lucide-react'

interface RemarkTemplate {
  id: string
  type: 'teacher' | 'principal'
  min_score: number
  max_score: number
  remark_text: string
}

interface LearnerRow {
  learner_id: string
  first_name: string
  last_name: string
  percentage: number
  grade: string
}

interface Props {
  reportId: string
  learners: LearnerRow[]
  templates: RemarkTemplate[]
  initialRemarks: Record<string, { teacher_remark?: string; principal_remark?: string }>
  showPrincipalRemark: boolean
}

export default function RemarksEditor({ reportId, learners, templates, initialRemarks, showPrincipalRemark }: Props) {
  const [remarks, setRemarks] = useState(initialRemarks)
  const [saving, setSaving] = useState(false)

  const teacherTemplates = templates.filter(t => t.type === 'teacher')
  const principalTemplates = templates.filter(t => t.type === 'principal')

  function matchingTemplates(list: RemarkTemplate[], pct: number) {
    return list.filter(t => pct >= t.min_score && pct <= t.max_score)
  }

  function updateRemark(learnerId: string, field: 'teacher_remark' | 'principal_remark', value: string) {
    setRemarks(prev => ({
      ...prev,
      [learnerId]: { ...prev[learnerId], [field]: value },
    }))
  }

  async function handleSave() {
    setSaving(true)
    const result = await saveStudentRemarks(reportId, remarks)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Remarks saved')
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <h2 className="font-semibold text-sm text-ink">Student Remarks</h2>
        <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm btn">
          {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save remarks</>}
        </button>
      </div>
      <div className="divide-y divide-surface-200">
        {learners.map(l => {
          const suggestions = matchingTemplates(teacherTemplates, l.percentage)
          const principalSuggestions = matchingTemplates(principalTemplates, l.percentage)
          const current = remarks[l.learner_id] ?? {}

          return (
            <div key={l.learner_id} className="px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">{l.last_name} {l.first_name}</p>
                <span className="text-xs text-ink-muted">{l.percentage.toFixed(1)}% · Grade {l.grade}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Teacher's remark</label>
                {suggestions.length > 0 && (
                  <select
                    className="input mb-1.5"
                    onChange={e => e.target.value && updateRemark(l.learner_id, 'teacher_remark', e.target.value)}
                    defaultValue=""
                  >
                    <option value="">Pick a suggested remark…</option>
                    {suggestions.map(t => (
                      <option key={t.id} value={t.remark_text}>{t.remark_text}</option>
                    ))}
                  </select>
                )}
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Or write a custom remark…"
                  value={current.teacher_remark ?? ''}
                  onChange={e => updateRemark(l.learner_id, 'teacher_remark', e.target.value)}
                />
              </div>

              {showPrincipalRemark && (
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Principal's remark</label>
                  {principalSuggestions.length > 0 && (
                    <select
                      className="input mb-1.5"
                      onChange={e => e.target.value && updateRemark(l.learner_id, 'principal_remark', e.target.value)}
                      defaultValue=""
                    >
                      <option value="">Pick a suggested remark…</option>
                      {principalSuggestions.map(t => (
                        <option key={t.id} value={t.remark_text}>{t.remark_text}</option>
                      ))}
                    </select>
                  )}
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Or write a custom remark…"
                    value={current.principal_remark ?? ''}
                    onChange={e => updateRemark(l.learner_id, 'principal_remark', e.target.value)}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
