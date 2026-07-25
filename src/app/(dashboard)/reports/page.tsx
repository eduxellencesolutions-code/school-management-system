import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, Download, Clock, CheckCircle, CheckCircle2, XCircle, Archive, Trash2 } from 'lucide-react'
import DeleteReportButton from '@/components/reports/DeleteReportButton'
import ApproveButton from '@/components/reports/ApproveButton'

export const runtime = 'nodejs'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  // FIX: Added !users_organization_id_fkey to resolve ambiguous relation
  const { data: profile } = await supabase
    .from('users').select('*, organization:organizations!users_organization_id_fkey(*)')
    .eq('id', authUser.id).single()

  const orgId = profile?.organization_id
  const userRole = profile?.role || 'teacher'
  const isInstitution = profile?.organization?.type === 'school' &&
    profile?.organization?.subscription_status === 'active'

  // Determine user roles
  // Both 'admin' and 'school_admin' are valid roles in the enum
  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const isPrincipal = profile?.role === 'principal'
  const isSolo = !profile?.organization_id

  // ✅ FIX: Add permission check for results.view
  const { data: hasResultsViewData } = orgId
    ? await supabase.rpc('has_permission', { p_user_id: authUser.id, p_permission_key: 'results.view' })
    : { data: false }
  const hasResultsView = !!hasResultsViewData

  let myClassTeacherOf: string[] = []
  // Only fetch class teacher assignments if not admin, not solo, and not principal
  if (!isSolo && !isAdmin && !isPrincipal) {
    const { data: assignments } = await supabase
      .from('teacher_assignments')
      .select('class_id')
      .eq('teacher_id', authUser.id)
      .eq('role', 'class_teacher')
    myClassTeacherOf = (assignments ?? []).map(a => a.class_id).filter(Boolean)
  }

  // Get subject teacher assignments too
  let mySubjectClassIds: string[] = []
  if (!isSolo && (isPrincipal || !isAdmin)) {
    const { data: subjectAssignments } = await supabase
      .from('teacher_assignments')
      .select('class_id')
      .eq('teacher_id', authUser.id)
      .eq('role', 'subject_teacher')
    mySubjectClassIds = (subjectAssignments ?? []).map(a => a.class_id).filter(Boolean)
  }

  // Combine both for "My Reports"
  const myOwnClassIds = [...new Set([...myClassTeacherOf, ...mySubjectClassIds])]

  // ── Reports Fetch ──
  let myReports: any[] = []
  let pendingApprovalReports: any[] = []
  let reportsError = null

  // ✅ FIX: Branch the query logic to treat hasResultsView like admin-level access
  if (orgId && (isAdmin || hasResultsView)) {
    // Admin (or a staff member with results.view permission) sees all reports in the organization
    const res = await supabase.from('reports')
      .select('*, group:groups(name, id), learner:learners(first_name, last_name), created_by_user:users!reports_created_by_fkey(name)')
      .eq('organization_id', orgId)
      .eq('deleted', false)
      .neq('report_status', 'archived')
      .order('created_at', { ascending: false })
    myReports = res.data ?? []
    reportsError = res.error
  } else if (orgId && isPrincipal) {
    // "My Reports" - principal sees reports they created OR their assigned classes
    const myRes = await supabase.from('reports')
      .select('*, group:groups(name, id), learner:learners(first_name, last_name), created_by_user:users!reports_created_by_fkey(name)')
      .eq('organization_id', orgId)
      .eq('deleted', false)
      .neq('report_status', 'archived')
      .or(`created_by.eq.${authUser.id},group_id.in.(${myOwnClassIds.length > 0 ? myOwnClassIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
      .order('created_at', { ascending: false })

    // "Pending Approval" - org-wide, anything awaiting principal action (excluding their own)
    const pendingRes = await supabase.from('reports')
      .select('*, group:groups(name, id), learner:learners(first_name, last_name), created_by_user:users!reports_created_by_fkey(name)')
      .eq('organization_id', orgId)
      .eq('deleted', false)
      .in('report_status', ['submitted', 'approved'])
      .neq('created_by', authUser.id)
      .order('created_at', { ascending: false })

    myReports = myRes.data ?? []
    pendingApprovalReports = pendingRes.data ?? []
    reportsError = myRes.error || pendingRes.error
  } else if (orgId && !isAdmin && !isPrincipal) {
    // Institution teacher (non-admin, non-principal) sees:
    // - reports they created
    // - reports for classes they're assigned to (class teacher or subject teacher)
    const res = await supabase.from('reports')
      .select('*, group:groups(name, id), learner:learners(first_name, last_name), created_by_user:users!reports_created_by_fkey(name)')
      .eq('organization_id', orgId)
      .eq('deleted', false)
      .neq('report_status', 'archived')
      .or(`created_by.eq.${authUser.id},group_id.in.(${myOwnClassIds.length > 0 ? myOwnClassIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
      .order('created_at', { ascending: false })
    myReports = res.data ?? []
    reportsError = res.error
  } else {
    // Solo teacher sees only their own reports (excluding archived)
    const res = await supabase.from('reports')
      .select('*, group:groups(name, id), learner:learners(first_name, last_name), created_by_user:users!reports_created_by_fkey(name)')
      .eq('created_by', authUser.id)
      .eq('deleted', false)
      .neq('report_status', 'archived')
      .order('created_at', { ascending: false })
    myReports = res.data ?? []
    reportsError = res.error
  }

  if (reportsError) {
    console.error('Error fetching reports:', reportsError)
  }

  // ✅ FIXED: Fetch classes - removed !inner from both queries
  const { data: classes, error: classesError } = await (orgId
    ? supabase.from('groups').select(`
        id, 
        name, 
        session:academic_sessions(name),
        term:terms(name)
      `)
        .eq('organization_id', orgId).eq('is_active', true).order('name')
    : supabase.from('groups').select(`
        id, 
        name, 
        session:academic_sessions(name),
        term:terms(name)
      `)
        .eq('instructor_id', authUser.id).eq('is_active', true).order('name')
  )

  if (classesError) {
    console.error('Error fetching classes:', classesError)
  }

  // Transform the data to extract the first item from arrays
  const transformedClasses = (classes || []).map((cls: any) => ({
    ...cls,
    session: Array.isArray(cls.session) ? cls.session[0] : cls.session,
    term: Array.isArray(cls.term) ? cls.term[0] : cls.term,
  }))

  // ── Statistics ──
  const totalReports = myReports?.length ?? 0
  const completedReports = myReports?.filter(r => r.status === 'ready').length ?? 0
  const processingReports = myReports?.filter(r => r.status === 'processing' || r.status === 'pending').length ?? 0
  const failedReports = myReports?.filter(r => r.status === 'failed').length ?? 0

  // ── Badge Functions ──
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ready: 'bg-green-100 text-green-800',
      processing: 'bg-amber-100 text-amber-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-gray-100 text-gray-800',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status || 'pending'}
      </span>
    )
  }

  const getReportStatusBadge = (reportStatus: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-amber-100 text-amber-800',
      approved: 'bg-blue-100 text-blue-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-surface-200 text-ink-faint',
    }
    const labels: Record<string, string> = {
      draft: 'Draft',
      submitted: '🟨 Awaiting Approval',
      approved: 'Approved — ready to lock',
      published: '🟩 Published',
      archived: 'Archived',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[reportStatus] || styles.draft}`}>
        {labels[reportStatus] || reportStatus}
      </span>
    )
  }

  // ── Render Helper ──
  function renderReportList(reports: any[], isAdmin: boolean, isSolo: boolean, isPrincipal: boolean = false) {
    if (!reports || reports.length === 0) {
      return (
        <div className="px-5 py-8 text-center text-sm text-ink-muted">
          No reports to display.
        </div>
      )
    }

    return (
      <div className="divide-y divide-surface-200">
        {reports.map((report) => {
          const groupName = (report.group as { name: string } | null)?.name || '—'
          const createdBy = (report.created_by_user as { name: string } | null)?.name || '—'
          const canDelete = isAdmin || isSolo
          
          return (
            <div key={report.id} className="px-5 py-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded bg-brand-50 text-brand-600 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-ink">{groupName}</p>
                    {getStatusBadge(report.status)}
                    {getReportStatusBadge(report.report_status)}
                  </div>
                  <p className="text-xs text-ink-muted">Created by {createdBy}</p>
                  <p className="text-xs text-ink-faint">
                    {report.created_at ? new Date(report.created_at).toLocaleDateString('en-NG', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {report.status === 'ready' && report.download_url && (
                  <a href={report.download_url} download className="btn-secondary btn-sm btn flex items-center gap-1">
                    <Download size={14} /> Download
                  </a>
                )}
                
                {/* ✅ Approve Button - Only for Principals on submitted reports */}
                {isPrincipal && report.report_status === 'submitted' && (
                  <ApproveButton reportId={report.id} />
                )}
                
                <Link href={`/reports/${report.id}`} className="btn-primary btn-sm btn">View</Link>
                <DeleteReportButton 
                  reportId={report.id} 
                  reportName={groupName} 
                  canDelete={canDelete}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">View and manage all generated reports</p>
        </div>
        <div className="flex items-center gap-2">
          {classes && classes.length > 0 && (
            <Link href="/reports/generate" className="btn-primary btn">
              <Plus size={15} /> Generate New Report
            </Link>
          )}
          <Link href="/reports/archive" className="btn-secondary btn">
            <Archive size={15} /> View Archive
          </Link>
          <Link href="/reports/trash" className="btn-secondary btn">
            <Trash2 size={15} /> View Trash
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="stat-value">{totalReports}</div><div className="stat-label">Total Reports</div></div>
        <div className="stat-card border-green-200"><div className="stat-value text-green-600">{completedReports}</div><div className="stat-label">Ready</div></div>
        <div className="stat-card border-amber-200"><div className="stat-value text-amber-600">{processingReports}</div><div className="stat-label">Processing</div></div>
        <div className="stat-card border-red-200"><div className="stat-value text-red-600">{failedReports}</div><div className="stat-label">Failed</div></div>
      </div>

      {/* ── PRINCIPAL VIEW: Two Sections ── */}
      {isPrincipal ? (
        <>
          {/* My Reports Section */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
                📋 My Reports
              </h2>
              <span className="text-xs text-ink-muted">
                {myReports.length} report{myReports.length !== 1 ? 's' : ''}
              </span>
            </div>
            {renderReportList(myReports, isAdmin, isSolo, isPrincipal)}
          </div>

          {/* Pending Approval Section */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
                🟨 Pending Approval
              </h2>
              <span className="text-xs text-ink-muted">
                {pendingApprovalReports.length} report{pendingApprovalReports.length !== 1 ? 's' : ''} awaiting your review
              </span>
            </div>
            {pendingApprovalReports.length > 0 ? (
              renderReportList(pendingApprovalReports, isAdmin, isSolo, isPrincipal)
            ) : (
              <div className="px-5 py-8 text-center text-sm text-ink-muted">
                No reports currently awaiting your approval.
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── NON-PRINCIPAL VIEW: Single List ── */
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink">All Reports</h2>
            <span className="text-xs text-ink-muted">{myReports.length} report{myReports.length !== 1 ? 's' : ''}</span>
          </div>
          {renderReportList(myReports, isAdmin, isSolo, false)}
        </div>
      )}
    </div>
  )
}