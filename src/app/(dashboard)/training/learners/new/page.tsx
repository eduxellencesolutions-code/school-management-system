// FILE: src/app/(dashboard)/training/learners/new/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

function NewTrainingLearnerForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedBatchId = searchParams.get('batch_id') ?? ''

  const [loading, setLoading] = useState(false)
  const [programmes, setProgrammes] = useState<{ id: string; name: string }[]>([])
  const [batches, setBatches] = useState<{ id: string; name: string; training_programme_id: string }[]>([])
  const [programmeId, setProgrammeId] = useState('')
  const [batchId, setBatchId] = useState(preselectedBatchId)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [otherNames, setOtherNames] = useState('')
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    async function load() {
      const { user } = await getAuthenticatedUser(supabase)
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
      if (!profile?.organization_id) return

      const [{ data: progs }, { data: batchRows }] = await Promise.all([
        supabase.from('training_programmes').select('id, name').eq('organization_id', profile.organization_id).order('name'),
        supabase.from('groups').select('id, name, training_programme_id').eq('organization_id', profile.organization_id).eq('type', 'batch').order('name'),
      ])
      setProgrammes(progs ?? [])
      setBatches(batchRows ?? [])

      if (preselectedBatchId) {
        const preselected = (batchRows ?? []).find(b => b.id === preselectedBatchId)
        if (preselected) setProgrammeId(preselected.training_programme_id)
      }
    }
    load()
  }, [])

  const batchesForProgramme = batches.filter(b => b.training_programme_id === programmeId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) { toast.error('First and last name are required'); return }
    if (!programmeId) { toast.error('Select a training programme'); return }
    if (!batchId) { toast.error('Select a batch'); return }
    setLoading(true)

    const { user } = await getAuthenticatedUser(supabase)
    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

    // group_id set to the batch — consistent with how batches are stored
    // as groups (type='batch') throughout this feature; a Training Centre
    // learner's "group" IS their batch, there is no separate class concept.
    const { data: learner, error: learnerError } = await supabase
      .from('learners')
      .insert({
        organization_id: profile?.organization_id,
        group_id: batchId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        other_names: otherNames.trim() || null,
        admission_number: admissionNumber.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        is_active: true,
      })
      .select('id')
      .single()

    if (learnerError) {
      setLoading(false)
      if (learnerError.code === '23505') { toast.error('Admission number already exists'); return }
      toast.error(learnerError.message)
      return
    }

    const { error: enrolError } = await supabase.from('training_enrolments').insert({
      organization_id: profile?.organization_id,
      learner_id: learner.id,
      training_programme_id: programmeId,
      batch_group_id: batchId,
    })

    setLoading(false)
    if (enrolError) {
      // Learner was created but enrolment failed — surface this precisely
      // rather than a generic error, since the two are not atomic here.
      toast.error(`Learner created, but enrolment failed: ${enrolError.message}. Enrol them manually from Enrolments.`)
      router.push('/training/enrolments/new')
      return
    }

    toast.success(`${firstName} ${lastName} added and enrolled`)
    router.push(`/training/enrolments?batch_id=${batchId}`)
    router.refresh()
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/training/enrolments" className="text-sm text-ink-muted hover:text-ink">Enrolments</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">New Learner</span>
      </div>
      <h1 className="page-title mb-1">Add a Learner</h1>
      <p className="page-subtitle mb-6">Creates the learner and enrols them into a programme and batch in one step.</p>

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Last name *</label>
            <input autoFocus type="text" className="input" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">First name *</label>
            <input type="text" className="input" value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Other names</label>
          <input type="text" className="input" value={otherNames} onChange={e => setOtherNames(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Admission / ID number</label>
            <input type="text" className="input font-mono" value={admissionNumber} onChange={e => setAdmissionNumber(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Phone</label>
            <input type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Email (optional)</label>
          <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <hr className="border-surface-200" />

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
          <button type="submit" disabled={loading} className="btn-primary btn flex-1">{loading ? 'Adding…' : 'Add & enrol learner'}</button>
          <Link href="/training/enrolments" className="btn-secondary btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}

export default function NewTrainingLearnerPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-faint">Loading…</p>}>
      <NewTrainingLearnerForm />
    </Suspense>
  )
}