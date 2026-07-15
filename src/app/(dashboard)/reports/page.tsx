import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, Download, Clock, CheckCircle, XCircle } from 'lucide-react'
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

  // Fetch reports — institution sees org reports, solo teacher sees own
  // FIX: Qualified the foreign key explicitly to resolve ambiguity with multiple user FKs
  const { data: reports, error: reportsError } = await (orgId
    ? supabase.from('reports')
        .select('*, group:groups(name, id), learner:learners(first_name, last_name), created_by_user:users!reports_created_by_fkey(name)')
        .eq('organization_id', orgId).eq('deleted', false).order('created_at', { ascending: false })
    : supabase.from('reports')
        .select('*, group:groups(name, id), learner:learners(first_name, last_name), created_by_user:users!reports_created_by_fkey(name)')
        .eq('created_by', authUser.id).eq('deleted', false).order('created_at', { ascending: false })
  )

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
        {classes && classes.length > 0 && (
          <Link href="/reports/generate" className="btn-primary btn">
            <Plus size={15} /> Generate New Report
          </Link>
        )}
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
              
              // Determine if user can delete this report
              const groupId = (report.group as { id: string } | null)?.id
              const canDelete = isAdmin || isSolo || (groupId ? myClassTeacherOf.includes(groupId) : false)
              
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

      {!isInstitution && (
        <div className="card p-5 bg-brand-50 border-brand-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={15} className="text-brand-600" />
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Upgrade for PDF Reports</span>
          </div>
          <p className="text-xs text-brand-700 leading-relaxed mb-3">
            Institution accounts get branded PDF report cards with your school logo and signatures.
          </p>
          <Link href="/settings?tab=billing" className="btn-primary btn-sm btn w-full justify-center">Upgrade now</Link>
        </div>
      )}
    </div>
  )
}
