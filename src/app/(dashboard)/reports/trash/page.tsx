import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, RefreshCw, FileText, AlertTriangle } from 'lucide-react'
import DeleteReportButton from '@/components/reports/DeleteReportButton'
import { restoreReport, emptyTrash } from '@/app/(dashboard)/reports/actions'
import ToastHandler from '@/components/ToastHandler'

export const runtime = 'nodejs'

export default async function TrashPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('*, organization:organizations!users_organization_id_fkey(*)')
    .eq('id', authUser.id).single()

  const orgId = profile?.organization_id
  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const isSolo = !profile?.organization_id

  // Only admins and solo teachers can access trash
  if (!isAdmin && !isSolo) {
    redirect('/reports')
  }

  // Fetch soft-deleted reports
  let query = supabase
    .from('reports')
    .select('*, group:groups(name, id), created_by_user:users!reports_created_by_fkey(name)')
    .eq('deleted', true)
    .order('deleted_at', { ascending: false })

  if (orgId) {
    query = query.eq('organization_id', orgId)
  } else {
    query = query.eq('created_by', authUser.id)
  }

  const { data: reports, error } = await query

  if (error) {
    console.error('Error fetching trash:', error)
  }

  // Calculate days remaining until auto-delete (30 days)
  const getDaysRemaining = (deletedAt: string) => {
    const deleted = new Date(deletedAt)
    const now = new Date()
    const diff = 30 - Math.floor((now.getTime() - deleted.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Handler for URL params */}
      <ToastHandler />

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/reports" className="text-ink-muted hover:text-ink flex items-center gap-1 text-sm">
              <ArrowLeft size={14} /> Back to Reports
            </Link>
          </div>
          <h1 className="page-title mt-2">🗑️ Trash</h1>
          <p className="page-subtitle">
            Reports in trash will be permanently deleted after 30 days.
          </p>
        </div>
        <div className="flex gap-2">
          {reports && reports.length > 0 && (
            <form action={emptyTrash}>
              <button
                type="submit"
                className="btn-secondary btn-sm btn text-red-600 hover:bg-red-50 border-red-200"
                onClick={(e) => {
                  if (!confirm('Permanently delete all reports in trash? This action cannot be undone.')) {
                    e.preventDefault()
                  }
                }}
              >
                <Trash2 size={14} /> Empty Trash
              </button>
            </form>
          )}
        </div>
      </div>

      {reports && reports.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink">
              {reports.length} report{reports.length !== 1 ? 's' : ''} in trash
            </h2>
            <span className="text-xs text-ink-faint">
              Auto-delete after 30 days
            </span>
          </div>
          <div className="divide-y divide-surface-200">
            {reports.map((report) => {
              const groupName = (report.group as { name: string } | null)?.name || '—'
              const createdBy = (report.created_by_user as { name: string } | null)?.name || '—'
              const daysRemaining = getDaysRemaining(report.deleted_at)
              const canDelete = isAdmin || isSolo
              const canRestore = isAdmin || isSolo

              return (
                <div key={report.id} className="px-5 py-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-red-50 text-red-600 flex items-center justify-center">
                      <FileText size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-ink">{groupName}</p>
                        {daysRemaining <= 7 ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {daysRemaining} days left
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-muted">Created by {createdBy}</p>
                      <p className="text-xs text-ink-faint">
                        Deleted {formatDate(report.deleted_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canRestore && (
                      <form action={restoreReport}>
                        <input type="hidden" name="id" value={report.id} />
                        <button
                          type="submit"
                          className="btn-secondary btn-sm btn flex items-center gap-1"
                        >
                          <RefreshCw size={14} /> Restore
                        </button>
                      </form>
                    )}
                    <DeleteReportButton 
                      reportId={report.id} 
                      reportName={groupName} 
                      canDelete={canDelete}
                      isPermanent={true}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="card py-16 flex flex-col items-center text-center">
          <Trash2 size={48} className="text-surface-200 mb-4" />
          <h3 className="font-semibold text-ink mb-1">Trash is empty</h3>
          <p className="text-sm text-ink-muted">
            Reports deleted from the main list will appear here.
          </p>
        </div>
      )}
    </div>
  )
}
