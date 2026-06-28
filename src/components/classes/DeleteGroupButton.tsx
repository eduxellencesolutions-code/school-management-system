'use client'

import { deleteGroup } from '@/app/(dashboard)/classes/actions'

interface Props {
  groupId: string
  groupName: string
}

export default function DeleteGroupButton({ groupId, groupName }: Props) {
  return (
    <form action={deleteGroup}>
      <input type="hidden" name="id" value={groupId} />
      <button
        type="submit"
        className="btn btn-sm text-red-600 hover:bg-red-50 border border-red-200"
        onClick={e => {
          if (!confirm(`Delete "${groupName}"? This cannot be undone.`)) {
            e.preventDefault()
          }
        }}
      >
        Delete
      </button>
    </form>
  )
}