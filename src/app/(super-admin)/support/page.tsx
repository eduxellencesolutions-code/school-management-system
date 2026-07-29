import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TicketQueue from '@/components/super-admin/TicketQueue'

export const dynamic = 'force-dynamic'

export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: canView } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'support.view' })
  if (!canView) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Support Tickets</h1>
        <p className="text-sm text-ink-muted mt-1">All customer support requests</p>
      </div>
      <TicketQueue />
    </div>
  )
}