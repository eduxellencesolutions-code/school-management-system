// FILE: src/app/(dashboard)/training/my-modules/[moduleId]/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Component { id: string; name: string; max_score: number; sequence: number }
interface Learner { id: string; first_name: string; last_name: string; admission_number: string | null }

function ModuleScoreEntry() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const searchParams = useSearchParams()
  const batchId = searchParams.get('batch') ?? ''
  const supabase = createClient()

  const [moduleName, setModuleName] = useState('')
  const [batchName, setBatchName] = useState('')
  const [components, setComponents] = useState<Component[]>([])
  const [learners, setLearners] = useState<Learner[]>([])
  const [values, setValues] = useState<Record<string, Record<string, string>>>({})
  const [anyFinal, setAnyFinal] = useState(false)
  const [completionStatus, setCompletionStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    if (!batchId) { setLoading(false); return }

    async function load() {
      const { data: mod } = await supabase.from('training_modules').select('name, template_id').eq('id', moduleId).single()
      setModuleName(mod?.name ?? '')

      const { data: batch } = await supabase.from('groups').select('name').eq('id', batchId).single()
      setBatchName(batch?.name ?? '')

      const { data: comps } = await supabase
        .from('assessment_components')
        .select('id, name, max_score, sequence')
        .eq('template_id', mod?.template_id)
        .order('sequence')
      setComponents(comps ?? [])

      const { data: enrolments } = await supabase
        .from('training_enrolments')
        .select('learner_id, learners(id, first_name, last_name, admission_number)')
        .eq('training_programme_id', (await supabase.from('training_modules').select('training_programme_id').eq('id', moduleId).single()).data?.training_programme_id)
        .eq('batch_group_id', batchId)
        .eq('status', 'registered')
      const learnerList = (enrolments ?? []).map((r: any) => r.learners).filter(Boolean)
      setLearners(learnerList)

      const { data: existingScores } = await supabase
        .from('training_scores')
        .select('learner_id, component_id, score, is_final')
        .eq('training_module_id', moduleId)
        .eq('batch_group_id', batchId)
      const grid: Record<string, Record<string, string>> = {}
      let hasFinal = false
      for (const s of existingScores ?? []) {
        if (!grid[s.learner_id]) grid[s.learner_id] = {}
        grid[s.learner_id][s.component_id] = String(s.score ?? '')
        if (s.is_final) hasFinal = true
      }
      setValues(grid)
      setAnyFinal(hasFinal)

      const { data: completion } = await supabase
        .from('module_completions')
        .select('status')
        .eq('training_module_id', moduleId)
        .eq('batch_group_id', batchId)
        .limit(1)
        .maybeSingle()
      setCompletionStatus(completion?.status ?? null)

      setLoading(false)
    }
    load()
  }, [moduleId, batchId])

  function setValue(learnerId: string, componentId: string, value: string) {
    setValues(prev => ({ ...prev, [learnerId]: { ...prev[learnerId], [componentId]: value } }))
  }

  function totalFor(learnerId: string) {
    const row = values[learnerId] ?? {}
    return components.reduce((sum, c) => sum + (Number(row[c.id]) || 0), 0)
  }

  async function handleSave() {
    setIsSaving(true)
    setMessage(null)
    const entries = []
    for (const learner of learners) {
      for (const comp of components) {
        const raw = values[learner.id]?.[comp.id]
        if (raw !== undefined && raw !== '') {
          entries.push({ learner_id: learner.id, component_id: comp.id, score: Number(raw) })
        }
      }
    }
    const { data, error } = await supabase.rpc('save_training_scores', {
      p_module_id: moduleId, p_batch_group_id: batchId, p_entries: entries,
    })
    setIsSaving(false)
    if (error) { setMessage({ type: 'error', text: error.message }); return }
    if (data?.failed > 0) {
      setMessage({ type: 'error', text: `Saved ${data.saved}, but ${data.failed} failed: ${data.failed_details.map((f: any) => f.error).join('; ')}` })
    } else {
      setMessage({ type: 'success', text: `Saved ${data.saved} score(s).` })
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    setMessage(null)
    const { error } = await supabase.rpc('submit_training_module', { p_module_id: moduleId, p_batch_group_id: batchId })
    setIsSubmitting(false)
    if (error) { setMessage({ type: 'error', text: error.message }); return }
    setMessage({ type: 'success', text: 'Submitted for confirmation.' })
    setAnyFinal(true)
    setCompletionStatus('trainer_submitted')
  }

  const locked = anyFinal && completionStatus !== 'draft'

  if (!batchId) {
    return (
      <div className="max-w-3xl">
        <Link href="/training/my-modules" className="text-sm text-ink-muted hover:text-ink">← My Modules</Link>
        <p className="text-sm text-ink-muted mt-4">No batch selected. Go back and choose a batch to enter scores for.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/training/my-modules" className="text-sm text-ink-muted hover:text-ink">My Modules</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">{moduleName} — {batchName}</span>
      </div>
      <h1 className="page-title mb-1">{moduleName}</h1>
      <p className="page-subtitle mb-6">
        {batchName} · {locked ? 'Scores are locked — submitted for confirmation.' : 'Enter scores for each enrolled learner, then submit for confirmation.'}
      </p>

      {message && (
        <div className={`border rounded-lg p-3 mb-4 text-sm ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-faint">Loading…</p>
      ) : components.length === 0 ? (
        <div className="card p-6">
          <p className="text-sm text-ink-muted">This module has no assessment template configured. Contact your Training Admin.</p>
        </div>
      ) : learners.length === 0 ? (
        <p className="text-sm text-ink-faint">No learners enrolled in this batch yet.</p>
      ) : (
        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase tracking-wider">
                <th className="pb-2 pr-3">Learner</th>
                {components.map(c => <th key={c.id} className="pb-2 pr-3">{c.name} (/{c.max_score})</th>)}
                <th className="pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {learners.map(l => (
                <tr key={l.id} className="border-t border-surface-100">
                  <td className="py-2 pr-3">{l.first_name} {l.last_name}<br /><span className="text-xs text-ink-faint">{l.admission_number}</span></td>
                  {components.map(c => (
                    <td key={c.id} className="py-2 pr-3">
                      <input
                        type="number" min={0} max={c.max_score}
                        className="input w-20"
                        disabled={locked}
                        value={values[l.id]?.[c.id] ?? ''}
                        onChange={e => setValue(l.id, c.id, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="py-2 font-medium">{totalFor(l.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!locked && (
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={isSaving} className="btn-secondary btn">{isSaving ? 'Saving…' : 'Save Scores'}</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary btn">{isSubmitting ? 'Submitting…' : 'Submit for Confirmation'}</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ModuleScoreEntryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-faint">Loading…</p>}>
      <ModuleScoreEntry />
    </Suspense>
  )
}