'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { reassignAdmin } from '@/app/(super-admin)/schools/[id]/actions'

interface Props {
  orgId: string
  teachers: { id: string; name: string; email: string }[]
  currentAdminId?: string
}

export default function ReassignAdminForm({ orgId, teachers, currentAdminId }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!selected) { toast.error('Select a user'); return }
    if (!confirm('This will remove admin rights from the current admin and grant them to the selected user. Continue?')) return

    setLoading(true)
    const fd = new FormData()
    fd.append('org_id', orgId)
    fd.append('user_id', selected)
    const result = await reassignAdmin(fd)
    setLoading(false)
    if (!result.success) { toast.error(result.message || 'Failed'); return }
    toast.success('Admin reassigned')
    router.refresh()
  }

  if (teachers.length === 0) {
    return <p className="text-xs text-ink-faint">No other users in this school to reassign to.</p>
  }

  return (
    <div className="flex gap-2 items-end">
      <select value={selected} onChange={e => setSelected(e.target.value)} className="input max-w-xs">
        <option value="">Select new admin…</option>
        {teachers.filter(t => t.id !== currentAdminId).map(t => (
          <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
        ))}
      </select>
      <button onClick={handleSubmit} disabled={loading} className="btn-primary btn-sm btn">Reassign admin</button>
    </div>
  )
}
