'use client'

import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { markAllNotificationsAsRead } from '@/app/(dashboard)/notifications/actions'
import toast from 'react-hot-toast'

export default function MarkAsReadButton() {
  const router = useRouter()

  async function handleMarkAllAsRead() {
    const result = await markAllNotificationsAsRead()
    if (result.success) {
      toast.success('All notifications marked as read')
      router.refresh()
    } else {
      toast.error('Failed to mark all as read')
    }
  }

  return (
    <button
      onClick={handleMarkAllAsRead}
      className="btn-secondary btn-sm btn flex items-center gap-1"
    >
      <Check size={14} /> Mark all read
    </button>
  )
}
