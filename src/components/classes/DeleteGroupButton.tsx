'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'

interface Props {
  groupId: string
  groupName: string
}

export default function DeleteGroupButton({ groupId, groupName }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`⚠️ Delete class "${groupName}"?\n\nThis will permanently remove the class and all its subjects. Students enrolled in this class will need to be reassigned.`)) return
    
    setLoading(true)
    const formData = new FormData()
    formData.append('id', groupId)
    
    const { deleteGroup } = await import('@/app/(dashboard)/classes/actions')
    await deleteGroup(formData)
    
    // ⚠️ No code after this runs because deleteGroup redirects
    // The classes page shows success/error via URL params (?success=deleted or ?error=...)
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="btn btn-sm text-red-600 hover:bg-red-50 border border-red-200 flex-1 justify-center"
    >
      <Trash2 size={12} /> {loading ? '...' : 'Delete'}
    </button>
  )
}
