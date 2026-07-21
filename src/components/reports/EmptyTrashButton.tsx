// components/reports/EmptyTrashButton.tsx
'use client'

import { Trash2 } from 'lucide-react'
import { emptyTrash } from '@/app/(dashboard)/reports/actions'

export default function EmptyTrashButton() {
  return (
    <form action={emptyTrash}>
      <button
        type="submit"
        className="btn-secondary btn-sm btn text-red-600 hover:bg-red-50 border-red-200"
        onClick={(e) => {
          if (!confirm('Permanently delete all reports in trash? This action cannot be undone.')) {
            e.preventDefault()
          }
        }}
      >
        <Trash2 size={14} /> Empty Trash
      </button>
    </form>
  )
}
