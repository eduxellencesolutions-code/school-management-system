import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportGenerator from '@/components/reports/ReportGenerator'

export default async function ReportsPage() {
  const supabase = createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  const orgId = profile?.organization_id

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, code, session:academic_sessions(name), term:terms(name)')
    .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
    .eq('is_active', true)
    .order('name')

  const { data: org } = orgId
    ? await supabase.from('organizations').select('*').eq('id', orgId).single()
    : { data: null }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Generate broadsheets, result cards, and subject reports</p>
      </div>
      <ReportGenerator groups={groups ?? []} org={org} userId={authUser.id} />
    </div>
  )
}
