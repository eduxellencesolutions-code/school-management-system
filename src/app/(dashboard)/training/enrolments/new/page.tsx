// FILE: src/app/(dashboard)/training/enrolments/new/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

function NewEnrolmentForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedBatchId = searchParams.get('batch_id') ?? ''

  const [loading, setLoading] = useState(false)
  const [programmes, setProgrammes] = useState<{ id: string; name: string }[]>([])
  const [batches, setBatches] = useState<{ id: string; name: string; training_programme_id: string }[]>([])
  const [learners, setLearners] = useState<{ id: string; first_name: string; last_name: string; admission_number: string | null }[]>([])
  const [programmeId, setProgrammeId] = useState('')
  const [batchId, setBatchId] = useState(preselectedBatchId)
  const [learnerId, setLearnerId] = useState('')

  useEffect(() => {
    async function load() {
      const { user } = await getAuthenticatedUser(supabase)
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
      if (!profile?.organization_id) return

      const [{ data: progs }, { data: batchRows }, { data: learnerRows }] = await Promise.all([
        supabase.from('training_programmes').select('id, name').eq('organization_id', profile.organization_id).order('name'),
        supabase.from('groups').select('id, name, training_programme_id').eq('organization_id', profile.organization_id).eq('type', 'batch').order('name'),
        supabase.from('learners').select('id, first_name, last_name, admission_number').eq('organization_id', profile.organization_id).eq('is_active', true).order('last_name'),
      ])
      setProgrammes(progs ?? [])
      setBatches(batchRows ?? [])
      setLearners(learnerRows ?? [])

      if (preselectedBatchId) {
        const preselectedBatch = (batchRows ?? []).find(b => b.id === preselectedBatchId)
        if (preselectedBatch) setProgrammeId(preselectedBatch.training_programme_id)
      }
    }
    load()
  }, [])

  const batchesForProgramme = batches.filter(b => b.training_programme_id === programmeId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!learnerId) { toast.error('Select a learner'); return }
    if (!programmeId) { toast.error('Select a training programme'); return }
    if (!batchId) { toast.error('Select a batch'); return }
    setLoading(true)

    const { user } = await getAuthenticatedUser(supabase)
    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

    const { error } = await supabase.from('training_enrolments').insert({
      organization_id: profile?.organization_id,
      learner_id: learnerId,
      training_programme_id: programmeId,
      batch_group_id: batchId,
    })

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success('Learner enrolled')
    router.push(`/training/enrolments?batch_id=${batchId}`)
    router.refresh()
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/training/enrolments" className="text-sm text-ink-muted hover:text-ink">Enrolments</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">New Enrolment</span>
      </div>
      <h1 className="page-title mb-1">Enrol a Learner</h1>
      <p className="page-subtitle mb-6">Select the learner, programme, and batch.</p>

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Learner *</label>
          <select className="input" value={learnerId} onChange={e => setLearnerId(e.target.value)}>
            <option value="">Select learner</option>
            {learners.map(l => (
              <option key={l.id} value={l.id}>
                {l.last_name} {l.first_name}{l.admission_number ? ` (${l.admission_number})` : ''}
              </option>
            ))}
          </select>
          {learners.length === 0 && (
            <p className="text-xs text-ink-faint mt-1">
              No learners found. <Link href="/training/learners/new" className="text-brand-500 hover:underline">Add a learner</Link> first.
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Training programme *</label>
          <select className="input" value={programmeId} onChange={e => { setProgrammeId(e.target.value); setBatchId('') }}>
            <option value="">Select programme</option>
            {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Batch *</label>
          <select className="input" value={batchId} onChange={e => setBatchId(e.target.value)} disabled={!programmeId}>
            <option value="">{programmeId ? 'Select batch' : 'Select a programme first'}</option>
            {batchesForProgramme.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {programmeId && batchesForProgramme.length === 0 && (
            <p className="text-xs text-ink-faint mt-1">
              No batches for this programme yet. <Link href={`/training/batches/new?programme_id=${programmeId}`} className="text-brand-500 hover:underline">Add one</Link>.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary btn flex-1">{loading ? 'Enrolling…' : 'Enrol learner'}</button>
          <Link href="/training/enrolments" className="btn-secondary btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}

export default function NewTrainingEnrolmentPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-faint">Loading…</p>}>
      <NewEnrolmentForm />
    </Suspense>
  )
}