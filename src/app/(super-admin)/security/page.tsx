import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SecurityCenter from '@/components/super-admin/SecurityCenter'

export const dynamic = 'force-dynamic'

export default async function SecurityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (!isSuperAdmin) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Security Center</h1>
        <p className="text-sm text-ink-muted mt-1">Audit trail, login activity, and alerts</p>
      </div>
      <SecurityCenter />
    </div>
  )
}