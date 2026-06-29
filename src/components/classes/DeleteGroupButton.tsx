'use client'

import { useTransition } from 'react'
import { deleteGroup } from '@/app/(dashboard)/classes/actions'
import { Trash2 } from 'lucide-react'

interface Props {
  groupId: string
  groupName: string
}

export default function DeleteGroupButton({ groupId, groupName }: Props) {
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Delete "${groupName}"? This cannot be undone.`)) return
    const fd = new FormData()
    fd.append('id', groupId)
    startTransition(() => { deleteGroup(fd) })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="btn btn-sm text-red-600 hover:bg-red-50 border border-red-200 disabled:opacity-50"
    >
      <Trash2 size={14} />
    </button>
  )
}
