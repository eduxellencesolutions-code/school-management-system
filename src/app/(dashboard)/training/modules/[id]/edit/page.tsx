// FILE: src/app/(dashboard)/training/modules/[id]/edit/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

function EditModuleForm() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const moduleId = params.id

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [programmes, setProgrammes] = useState<{ id: string; name: string }[]>([])
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([])

  const [programmeId, setProgrammeId] = useState('')
  const [name, setName] = useState('')
  const [sequence, setSequence] = useState('1')
  const [description, setDescription] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    async function load() {
      const { user } = await getAuthenticatedUser(supabase)
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
      if (!profile?.organization_id) {
        setInitialLoading(false)
        return
      }

      // Fetch programmes + templates + the module being edited + the
      // "Trainer" role id for this org in parallel.
      const [{ data: progs }, { data: temps }, { data: mod }, { data: trainerRole }] = await Promise.all([
        supabase.from('training_programmes').select('id, name').eq('organization_id', profile.organization_id).order('name'),
        supabase.from('assessment_templates').select('id, name').eq('organization_id', profile.organization_id).order('name'),
        supabase
          .from('training_modules')
          .select('id, name, sequence, description, template_id, trainer_id, training_programme_id, is_active')
          .eq('id', moduleId)
          .eq('organization_id', profile.organization_id)
          .maybeSingle(),
        supabase.from('school_roles').select('id').eq('organization_id', profile.organization_id).eq('name', 'Trainer').maybeSingle(),
      ])

      setProgrammes(progs ?? [])
      setTemplates(temps ?? [])

      // Only users assigned the "Trainer" role can be picked as a
      // trainer — filtering the dropdown to actual Trainers, not every
      // user in the org.
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

      if (!mod) {
        setNotFound(true)
        setInitialLoading(false)
        return
      }

      setName(mod.name ?? '')
      setSequence(String(mod.sequence ?? 1))
      setDescription(mod.description ?? '')
      setTemplateId(mod.template_id ?? '')
      setTrainerId(mod.trainer_id ?? '')
      setProgrammeId(mod.training_programme_id ?? '')
      setIsActive(mod.is_active ?? true)

      setInitialLoading(false)
    }
    load()
  }, [moduleId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Module name is required'); return }
    if (!programmeId) { toast.error('Select a training programme'); return }
    setLoading(true)

    const { error } = await supabase
      .from('training_modules')
      .update({
        training_programme_id: programmeId,
        name: name.trim(),
        sequence: Number(sequence) || 1,
        description: description.trim() || null,
        template_id: templateId || null,
        trainer_id: trainerId || null,
        is_active: isActive,
      })
      .eq('id', moduleId)

    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success(`${name} updated`)
    router.push(`/training/modules?programme_id=${programmeId}`)
    router.refresh()
  }

  if (initialLoading) {
    return <p className="text-sm text-ink-faint">Loading…</p>
  }

  if (notFound) {
    return (
      <div className="max-w-lg">
        <p className="text-sm text-red-600 mb-4">Module not found.</p>
        <Link href="/training/modules" className="btn-secondary btn">Back to Modules</Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/training/modules" className="text-sm text-ink-muted hover:text-ink">Modules</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">Edit Module</span>
      </div>
      <h1 className="page-title mb-1">Edit Module</h1>
      <p className="page-subtitle mb-6">Update this module's details or reassign its trainer.</p>

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
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-ink">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            Active
          </label>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary btn flex-1">{loading ? 'Saving…' : 'Save changes'}</button>
          <Link href={`/training/modules?programme_id=${programmeId}`} className="btn-secondary btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}

export default function EditTrainingModulePage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-faint">Loading…</p>}>
      <EditModuleForm />
    </Suspense>
  )
}