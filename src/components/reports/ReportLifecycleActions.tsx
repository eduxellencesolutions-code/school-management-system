'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Send, CheckCircle2, Unlock, Archive, Loader2 } from 'lucide-react'
import { submitReport, publishReport, unpublishReport, archiveReport } from '@/app/(dashboard)/reports/[id]/actions'

interface Props {
  reportId: string
  reportStatus: 'draft' | 'submitted' | 'published' | 'archived'
  canSubmit: boolean   // class teacher or admin
  canPublish: boolean  // admin only
  isSolo: boolean      // solo teacher - hide all lifecycle actions
}

export default function ReportLifecycleActions({ reportId, reportStatus, canSubmit, canPublish, isSolo }: Props) {
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

  // Early return for archived reports - this guarantees we never reach the JSX below when archived
  if (reportStatus === 'archived') {
    return <span className="text-xs text-ink-faint italic">This report is archived</span>
  }

  return (
    <div className="flex items-center gap-2">
      {reportStatus === 'draft' && canSubmit && (
        <button
          onClick={() => run(submitReport, 'submit')}
          disabled={loading !== null}
          className="btn-secondary btn-sm btn flex items-center gap-1.5"
        >
          {loading === 'submit' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Submit for approval
        </button>
      )}

      {reportStatus === 'submitted' && canPublish && (
        <button
          onClick={() => run(publishReport, 'publish')}
          disabled={loading !== null}
          className="btn-primary btn-sm btn flex items-center gap-1.5"
        >
          {loading === 'publish' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Publish & lock
        </button>
      )}

      {reportStatus === 'published' && canPublish && (
        <>
          <span className="text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
            <CheckCircle2 size={12} /> Published
          </span>
          <button
            onClick={() => run(unpublishReport, 'unpublish')}
            disabled={loading !== null}
            className="btn-secondary btn-sm btn flex items-center gap-1.5"
          >
            {loading === 'unpublish' ? <Loader2 size={13} className="animate-spin" /> : <Unlock size={13} />} Unlock
          </button>
        </>
      )}

      {reportStatus === 'published' && !canPublish && (
        <span className="text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
          <CheckCircle2 size={12} /> Published — locked for editing
        </span>
      )}

      {/* Removed the redundant '&& reportStatus !== 'archived'' check since the early return above guarantees we never reach here when archived */}
      {canPublish && (
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
