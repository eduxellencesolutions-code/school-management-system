// FILE: src/app/(dashboard)/training/completions/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

interface Completion {
  id: string
  status: string
  training_module_id: string
  learner_id: string
  batch_group_id: string
  training_modules: { name: string; training_programmes: { name: string } } | null
  learners: { first_name: string; last_name: string; admission_number: string | null } | null
  groups: { name: string } | null
}

export default function CompletionsReviewPage() {
  const supabase = createClient()
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  async function load() {
    const { user } = await getAuthenticatedUser(supabase)
    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

    const { data } = await supabase
      .from('module_completions')
      .select(`
        id, status, training_module_id, learner_id, batch_group_id,
        training_modules(name, training_programmes(name)),
        learners(first_name, last_name, admission_number),
        groups!module_completions_batch_group_id_fkey(name)
      `)
      .eq('organization_id', profile?.organization_id)
      .eq('status', 'trainer_submitted')
      .order('updated_at', { ascending: true })

    setCompletions((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleConfirm(id: string) {
    setActingId(id)
    const { error } = await supabase.rpc('confirm_module_completion', { p_completion_id: id, p_action: 'confirm' })
    setActingId(null)
    if (error) { toast.error(error.message); return }
    toast.success('Confirmed')
    load()
  }

  async function handleReturn(id: string) {
    const reason = window.prompt('Reason for returning this submission to the trainer:')
    if (!reason || !reason.trim()) return
    setActingId(id)
    const { error } = await supabase.rpc('confirm_module_completion', { p_completion_id: id, p_action: 'return', p_reason: reason.trim() })
    setActingId(null)
    if (error) { toast.error(error.message); return }
    toast.success('Returned to trainer')
    load()
  }

  return (
    <div>
      <h1 className="page-title mb-1">Completions Review</h1>
      <p className="page-subtitle mb-6">Module submissions awaiting your confirmation.</p>

      {loading ? (
        <p className="text-sm text-ink-faint">Loading…</p>
      ) : completions.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-ink-muted">Nothing awaiting confirmation right now.</p>
        </div>
      ) : (
        <div className="card divide-y divide-surface-200">
          {completions.map((c) => (
            <div key={c.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{c.learners?.first_name} {c.learners?.last_name}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {c.training_modules?.name} · {c.training_modules?.training_programmes?.name} · {c.groups?.name}
                  {c.learners?.admission_number && <span className="font-mono"> · {c.learners.admission_number}</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReturn(c.id)}
                  disabled={actingId === c.id}
                  className="btn-secondary btn-sm btn text-red-600 hover:bg-red-50"
                >
                  Return
                </button>
                <button
                  onClick={() => handleConfirm(c.id)}
                  disabled={actingId === c.id}
                  className="btn-primary btn-sm btn"
                >
                  {actingId === c.id ? 'Confirming…' : 'Confirm'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}