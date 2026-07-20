import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Bell, BellOff } from 'lucide-react'
import MarkAsReadButton from '@/components/notifications/MarkAsReadButton'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const unreadCount = notifications?.filter((n) => !n.read).length || 0

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <MarkAsReadButton />
        )}
      </div>

      {notifications?.length === 0 ? (
        <div className="card py-16 flex flex-col items-center text-center">
          <BellOff size={48} className="text-surface-200 mb-4" />
          <h3 className="font-semibold text-ink mb-1">No notifications</h3>
          <p className="text-sm text-ink-muted">You're all caught up!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications?.map((notification) => (
            <Link
              key={notification.id}
              href={`/reports/${notification.report_id}`}
              className={`card p-4 hover:shadow-md transition-shadow ${
                !notification.read ? 'border-brand-300 bg-brand-50/30' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">
                  {notification.type === 'report_submitted' ? '📋' : '✅'}
                </span>
                <div className="flex-1">
                  <p className={`text-sm ${!notification.read ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-ink-faint mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notification.read && (
                  <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-2" />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}