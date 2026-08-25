// src/app/(dashboard)/executive/notifications/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationSettings from '@/components/executive/NotificationSettings'

export default async function ExecutiveNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="page-title">Notification Preferences</h1>
        <p className="page-subtitle">Choose what you want to be alerted about, and how often.</p>
      </div>
      <NotificationSettings />
    </div>
  )
}