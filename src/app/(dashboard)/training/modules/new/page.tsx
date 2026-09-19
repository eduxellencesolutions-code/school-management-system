// FILE: src/app/(dashboard)/training/modules/new/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

function NewModuleForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedProgrammeId = searchParams.get('programme_id') ?? ''

  const [loading, setLoading] = useState(false)
  const [programmes, setProgrammes] = useState<{ id: string; name: string }[]>([])
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([])
  const [programmeId, setProgrammeId] = useState(preselectedProgrammeId)
  const [name, setName] = useState('')
  const [sequence, setSequence] = useState('1')
  const [description, setDescription] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [trainerId, setTrainerId] = useState('')

  useEffect(() => {
    async function load() {
      const { user } = await getAuthenticatedUser(supabase)
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
      if (!profile?.organization_id) return

      // Fetch programmes + templates + the "Trainer" role id for this org
      // in parallel. Only users assigned to that role can be picked as a
      // trainer — filtering the dropdown to actual Trainers, not every
      // user in the org.
      const [{ data: progs }, { data: temps }, { data: trainerRole }] = await Promise.all([
        supabase.from('training_programmes').select('id, name').eq('organization_id', profile.organization_id).order('name'),
        supabase.from('assessment_templates').select('id, name').eq('organization_id', profile.organization_id).order('name'),
        supabase.from('school_roles').select('id').eq('organization_id', profile.organization_id).eq('name', 'Trainer').maybeSingle(),
      ])
      setProgrammes(progs ?? [])
      setTemplates(temps ?? [])

      let trainerUsers: { id: string; name: string }[] = []
      if (trainerRole?.id) {
        const { data: assignments } = await supabase
          .from('staff_role_assignments')
          .select('user_id')
          .eq('role_id', trainerRole.id)
          .eq('is_active', true)
        const userIds = (assignments ?? []).map((a: any) => a.user_id)
        if (userIds.length > 0) {
          const { data: users } = await supabase.from('users').select('id, name').in('id', userIds).order('name')
          trainerUsers = users ?? []
        }
      }
      setTrainers(trainerUsers)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Module name is required'); return }
    if (!programmeId) { toast.error('Select a training programme'); return }
    setLoading(true)

    const { user } = await getAuthenticatedUser(supabase)
    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

    const { error } = await supabase.from('training_modules').insert({
      organization_id: profile?.organization_id,
      training_programme_id: programmeId,
      name: name.trim(),
      sequence: Number(sequence) || 1,
      description: description.trim() || null,
      template_id: templateId || null,
      trainer_id: trainerId || null,
    })

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success(`${name} added`)
    router.push(`/training/modules?programme_id=${programmeId}`)
    router.refresh()
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/training/modules" className="text-sm text-ink-muted hover:text-ink">Modules</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">New Module</span>
      </div>
      <h1 className="page-title mb-1">Add a Module</h1>
      <p className="page-subtitle mb-6">A unit within a training programme, assessed and delivered by a trainer.</p>

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Training programme *</label>
          <select className="input" value={programmeId} onChange={e => setProgrammeId(e.target.value)}>
            <option value="">Select programme</option>
            {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Module name *</label>
          <input autoFocus type="text" className="input" placeholder="e.g. Data Cleaning Fundamentals" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Sequence</label>
          <input type="number" min={1} className="input" value={sequence} onChange={e => setSequence(e.target.value)} />
          <p className="text-xs text-ink-muted mt-1">Order within the programme (1, 2, 3…)</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Assessment template</label>
          <select className="input" value={templateId} onChange={e => setTemplateId(e.target.value)}>
            <option value="">No template (add later)</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Trainer</label>
          <select className="input" value={trainerId} onChange={e => setTrainerId(e.target.value)}>
            <option value="">Unassigned (assign later)</option>
            {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Description (optional)</label>
          <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary btn flex-1">{loading ? 'Creating…' : 'Create module'}</button>
          <Link href="/training/modules" className="btn-secondary btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}

export default function NewTrainingModulePage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-faint">Loading…</p>}>
      <NewModuleForm />
    </Suspense>
  )
}