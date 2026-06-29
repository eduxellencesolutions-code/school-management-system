import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, Download, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import ReportGenerator from '@/components/reports/ReportGenerator'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*, organization:organizations(*)')
    .eq('id', authUser.id)
    .single()

  const orgId = profile?.organization_id
  const userRole = profile?.role || 'teacher'

  // Check if user is institution (has organization with type 'school' and paid plan)
  const isInstitution = profile?.organization?.type === 'school' && 
    profile?.organization?.subscription_status === 'active'

  // Fetch all reports for this organization
  const { data: reports } = await supabase
    .from('reports')
    .select(`
      *,
      group:groups(name),
      learner:learners(first_name, last_name),
      created_by_user:users(name)
    `)
    .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
    .order('created_at', { ascending: false })

  // Fetch classes for "Generate New Report" dropdown
  const { data: classes } = await supabase
    .from('groups')
    .select('id, name')
    .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
    .eq('is_active', true)
    .order('name')

  // Fetch organization details for ReportGenerator
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId ?? '00000000-0000-0000-0000-000000000000')
    .single()

  // Stats
  const totalReports = reports?.length ?? 0
  const completedReports = reports?.filter(r => r.status === 'completed').length ?? 0
  const processingReports = reports?.filter(r => r.status === 'processing' || r.status === 'pending').length ?? 0
  const failedReports = reports?.filter(r => r.status === 'failed').length ?? 0

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-600" />
      case 'processing':
        return <Clock size={16} className="text-amber-600 animate-pulse" />
      case 'failed':
        return <XCircle size={16} className="text-red-600" />
      default:
        return <Clock size={16} className="text-amber-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-amber-100 text-amber-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-gray-100 text-gray-800',
    }
    const style = styles[status] || styles.pending
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
        {status || 'pending'}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
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

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-value">{totalReports}</div>
          <div className="stat-label">Total Reports</div>
        </div>
        <div className="stat-card border-green-200">
          <div className="stat-value text-green-600">{completedReports}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card border-amber-200">
          <div className="stat-value text-amber-600">{processingReports}</div>
          <div className="stat-label">Processing</div>
        </div>
        <div className="stat-card border-red-200">
          <div className="stat-value text-red-600">{failedReports}</div>
          <div className="stat-label">Failed</div>
        </div>
      </div>

      {/* Report Generator Component */}
      <ReportGenerator 
        groups={classes || []} 
        org={org || null} 
        userId={authUser.id}
        userRole={userRole}
      />

      {/* Reports List */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-sm text-ink">All Reports</h2>
        </div>

        {reports && reports.length > 0 ? (
          <div className="divide-y divide-surface-200">
            {reports.map((report) => {
              const groupName = (report.group as { name: string } | null)?.name || '—'
              const learnerName = (report.learner as { first_name: string; last_name: string } | null)
                ? `${(report.learner as { first_name: string; last_name: string }).last_name} ${(report.learner as { first_name: string; last_name: string }).first_name}`
                : 'All Students'
              const createdBy = (report.created_by_user as { name: string } | null)?.name || '—'

              return (
                <div key={report.id} className="px-5 py-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-brand-50 text-brand-600 text-sm font-bold flex items-center justify-center">
                      <FileText size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink">{groupName}</p>
                        {getStatusBadge(report.status)}
                      </div>
                      <p className="text-xs text-ink-muted">
                        {learnerName} · Created by {createdBy}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {report.created_at ? new Date(report.created_at).toLocaleDateString('en-NG', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.status === 'completed' && report.download_url && (
                      <a
                        href={report.download_url}
                        download
                        className="btn-secondary btn-sm btn flex items-center gap-1"
                      >
                        <Download size={14} /> Download
                      </a>
                    )}
                    <Link
                      href={`/reports/preview?id=${report.id}`}
                      className="btn-primary btn-sm btn"
                    >
                      View
                    </Link>
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
              <Link href="/reports/generate" className="btn-primary btn-sm btn">
                Generate your first report
              </Link>
            ) : (
              <Link href="/classes/new" className="btn-primary btn-sm btn">
                Create a class first
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Institution Features Notice */}
      {!isInstitution && (
        <div className="card p-5 bg-brand-50 border-brand-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={15} className="text-brand-600" />
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Upgrade for PDF Reports</span>
          </div>
          <p className="text-xs text-brand-700 leading-relaxed mb-3">
            Institution accounts get branded PDF report cards with your school logo, teacher signatures, 
            and principal signatures. Upgrade to Small School plan starting at ₦10,000/year.
          </p>
          <Link href="/settings?tab=billing" className="btn-primary btn-sm btn w-full justify-center">
            Upgrade now
          </Link>
        </div>
      )}
    </div>
  )
}
