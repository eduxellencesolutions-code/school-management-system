import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportGenerator from '@/components/reports/ReportGenerator'

export default async function ReportsPage() {
  // ✅ FIX: Add await here
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()
  
  const orgId = profile?.organization_id

  // Fetch groups with session and term data
  const { data: groupsData } = await supabase
    .from('groups')
    .select('id, name, code, session:academic_sessions(name), term:terms(name)')
    .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
    .eq('is_active', true)
    .order('name')

  // FIX: Transform groups to match Group type
  const groups = groupsData?.map((group: any) => ({
    id: group.id,
    name: group.name,
    code: group.code,
    session: group.session?.[0] || null,  // Extract first session or null
    term: group.term?.[0] || null,        // Extract first term or null
    is_active: true,
    organization_id: orgId ?? '',
    type: 'class' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })) ?? []

  const { data: org } = orgId
    ? await supabase.from('organizations').select('*').eq('id', orgId).single()
    : { data: null }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Generate broadsheets, result cards, and subject reports</p>
      </div>
      <ReportGenerator groups={groups} org={org} userId={authUser.id} />
    </div>
  )
}