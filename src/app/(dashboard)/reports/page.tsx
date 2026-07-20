import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, Download, Clock, CheckCircle, XCircle, Archive } from 'lucide-react'
import DeleteReportButton from '@/components/reports/DeleteReportButton'

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

  // Determine delete permissions
  // Both 'admin' and 'school_admin' are valid roles in the enum
  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const isSolo = !profile?.organization_id

  let myClassTeacherOf: string[] = []
  if (!isSolo && !isAdmin) {
    const { data: assignments } = await supabase
      .from('teacher_assignments')
      .select('class_id')
      .eq('teacher_id', authUser.id)
      .eq('role', 'class_teacher')
    myClassTeacherOf = (assignments ?? []).map(a => a.class_id).filter(Boolean)
  }

  // ✅ FIXED: Three-branch reports fetch with proper scoping
  let reports, reportsError

  if (orgId && isAdmin) {
    // Admin sees all reports in the organization (excluding archived)
    const res = await supabase.from('reports')
      .select('*, group:groups(name, id), learner:learners(first_name, last_name), created_by_user:users!reports_created_by_fkey(name)')
      .eq('organization_id', orgId)
      .eq('deleted', false)
      .neq('report_status', 'archived')
      .order('created_at', { ascending: false })
    reports = res.data; reportsError = res.error
  } else if (orgId && !isAdmin) {
    // Institution teacher (non-admin) sees: reports they created + reports for classes they're class teacher of (excluding archived)
    const res = await supabase.from('reports')
      .select('*, group:groups(name, id), learner:learners(first_name, last_name), created_by_user:users!reports_created_by_fkey(name)')
      .eq('organization_id', orgId)
      .eq('deleted', false)
      .neq('report_status', 'archived')
      .or(`created_by.eq.${authUser.id},group_id.in.(${myClassTeacherOf.length > 0 ? myClassTeacherOf.join(',') : '00000000-0000-0000-0000-000000000000'})`)
      .order('created_at', { ascending: false })
    reports = res.data; reportsError = res.error
  } else {
    // Solo teacher sees only their own reports (excluding archived)
    const res = await supabase.from('reports')
      .select('*, group:groups(name, id), learner:learners(first_name, last_name), created_by_user:users!reports_created_by_fkey(name)')
      .eq('created_by', authUser.id)
      .eq('deleted', false)
      .neq('report_status', 'archived')
      .order('created_at', { ascending: false })
    reports = res.data; reportsError = res.error
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

  const totalReports = reports?.length ?? 0
  const completedReports = reports?.filter(r => r.status === 'ready').length ?? 0
  const processingReports = reports?.filter(r => r.status === 'processing' || r.status === 'pending').length ?? 0
  const failedReports = reports?.filter(r => r.status === 'failed').length ?? 0

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
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="stat-value">{totalReports}</div><div className="stat-label">Total Reports</div></div>
        <div className="stat-card border-green-200"><div className="stat-value text-green-600">{completedReports}</div><div className="stat-label">Ready</div></div>
        <div className="stat-card border-amber-200"><div className="stat-value text-amber-600">{processingReports}</div><div className="stat-label">Processing</div></div>
        <div className="stat-card border-red-200"><div className="stat-value text-red-600">{failedReports}</div><div className="stat-label">Failed</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-sm text-ink">All Reports</h2>
        </div>
        {reports && reports.length > 0 ? (
          <div className="divide-y divide-surface-200">
            {reports.map((report) => {
              const groupName = (report.group as { name: string } | null)?.name || '—'
              const createdBy = (report.created_by_user as { name: string } | null)?.name || '—'
              
              // ✅ FIXED: Only admins and solo teachers can delete
              const groupId = (report.group as { id: string } | null)?.id
              const canDelete = isAdmin || isSolo
              
              return (
                <div key={report.id} className="px-5 py-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-brand-50 text-brand-600 flex items-center justify-center">
                      <FileText size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink">{groupName}</p>
                        {getStatusBadge(report.status)}
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
                    {/* FIX: Changed from /reports/preview?id= to /reports/ for the consolidated view */}
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
        ) : (
          <div className="px-5 py-12 text-center">
            <FileText size={40} className="text-surface-200 mx-auto mb-3" />
            <p className="text-sm text-ink-muted mb-3">No reports generated yet</p>
            {classes && classes.length > 0 ? (
              <Link href="/reports/generate" className="btn-primary btn-sm btn">Generate your first report</Link>
            ) : (
              <Link href="/classes/new" className="btn-primary btn-sm btn">Create a class first</Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
