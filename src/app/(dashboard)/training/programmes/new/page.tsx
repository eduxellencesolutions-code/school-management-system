// FILE: src/app/(dashboard)/training/programmes/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default function NewTrainingProgrammePage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Programme name is required'); return }
    setLoading(true)

    const { user } = await getAuthenticatedUser(supabase)
    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

    if (!profile?.organization_id) {
      toast.error('No organization found for your account')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('training_programmes').insert({
      organization_id: profile.organization_id,
      name: name.trim(),
      code: code.trim() || null,
      description: description.trim() || null,
      duration: duration.trim() || null,
    })

    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`${name} added`)
    router.push('/training/programmes')
    router.refresh()
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/training/programmes" className="text-sm text-ink-muted hover:text-ink">Training Programmes</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">New Programme</span>
      </div>
      <h1 className="page-title mb-1">Add a Training Programme</h1>
      <p className="page-subtitle mb-6">Define the programme — modules and batches are added afterward.</p>

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Programme name *</label>
          <input
            autoFocus
            type="text"
            className="input"
            placeholder="e.g. Data Analysis"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Code (optional)</label>
          <input
            type="text"
            className="input font-mono"
            placeholder="e.g. DA-101"
            value={code}
            onChange={e => setCode(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Duration (optional)</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. 6 weeks"
            value={duration}
            onChange={e => setDuration(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Description (optional)</label>
          <textarea
            className="input"
            rows={3}
            placeholder="What this programme covers"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary btn flex-1">
            {loading ? 'Creating…' : 'Create programme'}
          </button>
          <Link href="/training/programmes" className="btn-secondary btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}