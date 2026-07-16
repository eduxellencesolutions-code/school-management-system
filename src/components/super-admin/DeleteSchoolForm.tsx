'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { permanentlyDeleteSchool } from '@/app/(super-admin)/schools/[id]/actions'

interface Props { orgId: string; orgName: string }

export default function DeleteSchoolForm({ orgId, orgName }: Props) {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const fd = new FormData()
    fd.append('org_id', orgId)
    fd.append('confirm_name', confirmText)
    const result = await permanentlyDeleteSchool(fd)
    setLoading(false)
    if (!result.success) { toast.error(result.message || 'Failed'); return }
    toast.success('School deleted')
    router.push('/schools')
  }

  return (
    <div className="flex gap-2 items-end">
      <div>
        <label className="block text-xs font-medium text-ink-muted mb-1">Type "{orgName}" to confirm</label>
        <input value={confirmText} onChange={e => setConfirmText(e.target.value)} className="input input-sm" />
      </div>
      <button
        onClick={handleDelete}
        disabled={loading || confirmText !== orgName}
        className="btn-sm btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
      >
        Permanently delete
      </button>
    </div>
  )
}
