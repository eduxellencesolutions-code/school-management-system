// FILE: src/app/(dashboard)/training/batches/new/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

function NewBatchForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedProgrammeId = searchParams.get('programme_id') ?? ''

  const [loading, setLoading] = useState(false)
  const [programmes, setProgrammes] = useState<{ id: string; name: string }[]>([])
  const [programmeId, setProgrammeId] = useState(preselectedProgrammeId)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  useEffect(() => {
    async function load() {
      const { user } = await getAuthenticatedUser(supabase)
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
      if (!profile?.organization_id) return
      const { data: progs } = await supabase.from('training_programmes').select('id, name').eq('organization_id', profile.organization_id).order('name')
      setProgrammes(progs ?? [])
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Batch name is required'); return }
    if (!programmeId) { toast.error('Select a training programme'); return }
    setLoading(true)

    const { user } = await getAuthenticatedUser(supabase)
    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

    const { error } = await supabase.from('groups').insert({
      organization_id: profile?.organization_id,
      type: 'batch',
      training_programme_id: programmeId,
      name: name.trim(),
      code: code.trim() || null,
    })

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success(`${name} added`)
    router.push(`/training/batches?programme_id=${programmeId}`)
    router.refresh()
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/training/batches" className="text-sm text-ink-muted hover:text-ink">Batches</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">New Batch</span>
      </div>
      <h1 className="page-title mb-1">Add a Batch</h1>
      <p className="page-subtitle mb-6">A cohort of learners running through a programme together.</p>

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Training programme *</label>
          <select className="input" value={programmeId} onChange={e => setProgrammeId(e.target.value)}>
            <option value="">Select programme</option>
            {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Batch name *</label>
          <input autoFocus type="text" className="input" placeholder="e.g. January 2027" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Code (optional)</label>
          <input type="text" className="input font-mono" placeholder="e.g. JAN27" value={code} onChange={e => setCode(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary btn flex-1">{loading ? 'Creating…' : 'Create batch'}</button>
          <Link href="/training/batches" className="btn-secondary btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}

export default function NewTrainingBatchPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-faint">Loading…</p>}>
      <NewBatchForm />
    </Suspense>
  )
}