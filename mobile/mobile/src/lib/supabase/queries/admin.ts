import { supabase } from '../client'

export interface AdminDashboardData {
  org: {
    name: string
    logoUrl: string | null
    subscriptionPlan: string | null
    subscriptionStatus: string | null
    subscriptionExpiresAt: string | null
  }
  currentTerm: { termName: string; sessionName: string } | null
  overview: {
    totalStudents: number
    totalClasses: number
    attendanceToday: number | null
    feesCollected: number
    feesExpected: number
  }
  totalTeachers: number
  pendingApprovals: {
    count: number
    items: { id: string; className: string | null; submittedAt: string | null }[]
  }
  notifications: { id: string; title: string; body: string; createdAt: string; isRead: boolean }[]
}

export async function loadAdminDashboard(orgId: string): Promise<AdminDashboardData> {
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('name, logo_url, subscription_plan, subscription_status, subscription_expires_at, current_term_id')
    .eq('id', orgId)
    .single()

  if (orgError || !org) throw new Error('Could not load school profile.')

  let currentTerm: AdminDashboardData['currentTerm'] = null
  if (org.current_term_id) {
    const { data: term } = await supabase
      .from('terms')
      .select('name, session_id')
      .eq('id', org.current_term_id)
      .single()

    if (term) {
      const { data: session } = await supabase
        .from('academic_sessions')
        .select('name')
        .eq('id', term.session_id)
        .single()
      currentTerm = { termName: term.name, sessionName: session?.name ?? '' }
    }
  }

  const { data: overviewRaw, error: overviewError } = await supabase.rpc('get_executive_overview', {
    p_org_id: orgId,
  })
  if (overviewError) throw new Error('Could not load school overview.')

  const { count: totalTeachers } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .in('role', ['teacher', 'lecturer', 'assistant'])

  const { count: pendingCount } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('report_status', 'submitted')
    .eq('deleted', false)

  const { data: pendingList } = await supabase
    .from('reports')
    .select('id, submitted_at, groups(name)')
    .eq('organization_id', orgId)
    .eq('report_status', 'submitted')
    .eq('deleted', false)
    .order('submitted_at', { ascending: true })
    .limit(5)

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, body, created_at, is_read')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    org: {
      name: org.name,
      logoUrl: org.logo_url,
      subscriptionPlan: org.subscription_plan,
      subscriptionStatus: org.subscription_status,
      subscriptionExpiresAt: org.subscription_expires_at,
    },
    currentTerm,
    overview: {
      totalStudents: overviewRaw.total_students ?? 0,
      totalClasses: overviewRaw.total_classes ?? 0,
      attendanceToday: overviewRaw.attendance_today,
      feesCollected: overviewRaw.fees_collected ?? 0,
      feesExpected: overviewRaw.fees_expected ?? 0,
    },
    totalTeachers: totalTeachers ?? 0,
    pendingApprovals: {
      count: pendingCount ?? 0,
      items: (pendingList ?? []).map((r: any) => ({
        id: r.id,
        className: r.groups?.name ?? null,
        submittedAt: r.submitted_at,
      })),
    },
    notifications: (notifications ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: n.created_at,
      isRead: n.is_read,
    })),
  }
}