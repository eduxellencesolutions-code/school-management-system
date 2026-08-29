import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Archive, FileText } from 'lucide-react'
import { unarchiveReport } from '../[id]/actions'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export const dynamic = 'force-dynamic'

export default async function ArchivedReportsPage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()

  const orgId = profile?.organization_id
  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const isSolo = !orgId

  if (!isAdmin && !isSolo) redirect('/reports')

  const { data: reports } = orgId
    ? await supabase.from('reports')
        .select('*, group:groups(name)')
        .eq('organization_id', orgId).eq('report_status', 'archived').eq('deleted', false)
        .order('created_at', { ascending: false })
    : await supabase.from('reports')
        .select('*, group:groups(name)')
        .eq('created_by', user.id).eq('report_status', 'archived').eq('deleted', false)
        .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/reports" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Reports
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">Archive</span>
      </div>

      <div>
        <h1 className="page-title">Archived Reports</h1>
        <p className="page-subtitle">Reports moved out of the active list. Restore any of these to bring them back.</p>
      </div>

      <div className="card">
        {reports && reports.length > 0 ? (
          <div className="divide-y divide-surface-200">
            {reports.map((report: any) => (
              <div key={report.id} className="px-5 py-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-surface-100 text-ink-faint flex items-center justify-center">
                    <Archive size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{report.group?.name ?? '—'}</p>
                    <p className="text-xs text-ink-faint">
                      Generated {new Date(report.created_at).toLocaleDateString('en-NG')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/reports/${report.id}`} className="btn-secondary btn-sm btn">View</Link>
                  <form action={async (formData) => {
                    'use server'
                    await unarchiveReport(formData)
                  }}>
                    <input type="hidden" name="id" value={report.id} />
                    <button type="submit" className="btn-primary btn-sm btn">Restore</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <FileText size={40} className="text-surface-200 mx-auto mb-3" />
            <p className="text-sm text-ink-muted">No archived reports</p>
          </div>
        )}
      </div>
    </div>
  )
}
