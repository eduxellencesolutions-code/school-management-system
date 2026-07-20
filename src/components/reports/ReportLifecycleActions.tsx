'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Send, CheckCircle2, Unlock, Archive, Loader2 } from 'lucide-react'
import { submitReport, approveReport, publishReport, unpublishReport, archiveReport } from '@/app/(dashboard)/reports/[id]/actions'

interface Props {
  reportId: string
  reportStatus: 'draft' | 'submitted' | 'approved' | 'published' | 'archived'  // ✅ Added 'approved'
  canSubmit: boolean   // class teacher only (admin removed per new workflow)
  canApprove: boolean  // ✅ NEW - principal only, when status is 'submitted'
  canPublish: boolean  // admin only, and only when status is 'approved'
  isSolo: boolean      // solo teacher - hide all lifecycle actions
}

export default function ReportLifecycleActions({ 
  reportId, 
  reportStatus, 
  canSubmit, 
  canApprove,   // ✅ NEW
  canPublish, 
  isSolo 
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function run(action: (fd: FormData) => Promise<{ success: boolean; message?: string }>, label: string) {
    setLoading(label)
    const fd = new FormData()
    fd.append('id', reportId)
    const result = await action(fd)
    setLoading(null)
    if (!result.success) {
      toast.error(result.message || 'Action failed')
      return
    }
    toast.success('Done')
    router.refresh()
  }

  // ✅ Solo teachers don't need submit/publish/archive workflow
  if (isSolo) return null

  // Early return for archived reports
  if (reportStatus === 'archived') {
    return <span className="text-xs text-ink-faint italic">This report is archived</span>
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Submit button - only for draft reports, class teacher only */}
      {reportStatus === 'draft' && canSubmit && (
        <button
          onClick={() => run(submitReport, 'submit')}
          disabled={loading !== null}
          className="btn-secondary btn-sm btn flex items-center gap-1.5"
        >
          {loading === 'submit' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Submit for approval
        </button>
      )}

      {/* ✅ Approve button - only for principals on submitted reports */}
      {reportStatus === 'submitted' && canApprove && (
        <button
          onClick={() => run(approveReport, 'approve')}
          disabled={loading !== null}
          className="btn-success btn-sm btn flex items-center gap-1.5"
        >
          {loading === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Approve
        </button>
      )}

      {/* Show status when submitted but user is not the principal */}
      {reportStatus === 'submitted' && !canApprove && (
        <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
          Awaiting principal's approval
        </span>
      )}

      {/* Publish button - only for approved reports, admin only */}
      {reportStatus === 'approved' && canPublish && (
        <button
          onClick={() => run(publishReport, 'publish')}
          disabled={loading !== null}
          className="btn-primary btn-sm btn flex items-center gap-1.5"
        >
          {loading === 'publish' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Publish & lock
        </button>
      )}

      {/* Published status - show lock icon for everyone */}
      {reportStatus === 'published' && (
        <span className="text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
          <CheckCircle2 size={12} /> Published — locked for editing
        </span>
      )}

      {/* Unpublish button - only for published reports, admin only */}
      {reportStatus === 'published' && canPublish && (
        <button
          onClick={() => run(unpublishReport, 'unpublish')}
          disabled={loading !== null}
          className="btn-secondary btn-sm btn flex items-center gap-1.5"
        >
          {loading === 'unpublish' ? <Loader2 size={13} className="animate-spin" /> : <Unlock size={13} />} Unlock
        </button>
      )}

      {/* Archive button - for submitted, approved, or published reports, admin only */}
      {(reportStatus === 'submitted' || reportStatus === 'approved' || reportStatus === 'published') && canPublish && (
        <button
          onClick={() => { if (confirm('Archive this report? It will be hidden from the main list.')) run(archiveReport, 'archive') }}
          disabled={loading !== null}
          className="btn-sm btn text-ink-muted hover:bg-surface-100 flex items-center gap-1.5"
        >
          {loading === 'archive' ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />} Archive
        </button>
      )}
    </div>
  )
}
