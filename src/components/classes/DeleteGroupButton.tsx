'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  groupId: string
  groupName: string
}

export default function DeleteGroupButton({ groupId, groupName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`⚠️ Delete class "${groupName}"?\n\nThis will permanently remove the class and all its subjects. Students enrolled in this class will need to be reassigned.`)) return
    
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('id', groupId)
      
      const { deleteGroup } = await import('@/app/(dashboard)/classes/actions')
      await deleteGroup(formData)
      
      // The action will redirect, but we'll handle it here too
      toast.success(`Class "${groupName}" deleted successfully`)
      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete class')
    } finally {
      setLoading(false)
    }
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
