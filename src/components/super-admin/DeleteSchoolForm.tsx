// src/components/super-admin/DeleteSchoolForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { permanentlyDeleteSchool } from '@/app/(super-admin)/schools/[id]/actions'
import { createClient } from '@/lib/supabase/client'

interface Props { orgId: string; orgName: string }

type Dependency = {
  table: string
  record_count: number
  category: string
  fk_delete_behavior: string
  blocks_deletion: boolean
  recommendation: string
}
type DepReport = {
  dependencies: Dependency[]
  safe_to_delete: boolean
} | null

const CATEGORY_LABELS: Record<string, string> = {
  audit: 'Audit record',
  billing: 'Billing record',
  academic: 'Academic record',
  people: 'People',
  operational: 'Operational data',
}

export default function DeleteSchoolForm({ orgId, orgName }: Props) {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [report, setReport] = useState<DepReport>(null)

  useEffect(() => {
    async function check() {
      setChecking(true)
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_organization_delete_dependencies', { p_org_id: orgId })
      if (error) {
        toast.error('Could not check deletion safety: ' + error.message)
        setReport(null)
      } else {
        setReport(data)
      }
      setChecking(false)
    }
    check()
  }, [orgId])

  async function handleDelete() {
    setLoading(true)
    const fd = new FormData()
    fd.append('org_id', orgId)
    fd.append('confirm_name', confirmText)
    const result = await permanentlyDeleteSchool(fd)
    setLoading(false)
    if (!result.success) { toast.error(result.message || 'Failed'); return }
    toast.success('School deleted')
    router.push('/schools')
  }

  if (checking) {
    return <div className="flex items-center gap-2 text-sm text-ink-muted"><Loader2 size={14} className="animate-spin" /> Checking for dependent records…</div>
  }

  if (!report) {
    return <p className="text-sm text-red-600">Could not verify whether this organization can be safely deleted. Try again, or contact engineering.</p>
  }

  const blocking = report.dependencies.filter(d => d.blocks_deletion)
  const nonBlocking = report.dependencies.filter(d => !d.blocks_deletion)

  return (
    <div className="flex flex-col gap-4">
      {report.dependencies.length === 0 && (
        <p className="text-sm text-ink-muted">No dependent records found. This organization is safe to permanently delete.</p>
      )}

      {blocking.length > 0 && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-red-700">
            This organization cannot be permanently deleted — it has existing historical records.
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-red-700/70">
                <th className="pb-1 pr-2">Table</th>
                <th className="pb-1 pr-2">Type</th>
                <th className="pb-1 pr-2">Count</th>
                <th className="pb-1">What this means</th>
              </tr>
            </thead>
            <tbody>
              {blocking.map(d => (
                <tr key={d.table} className="align-top">
                  <td className="py-1 pr-2 font-mono text-[11px] text-red-800">{d.table}</td>
                  <td className="py-1 pr-2 text-red-700">{CATEGORY_LABELS[d.category] ?? d.category}</td>
                  <td className="py-1 pr-2 text-red-700">{d.record_count}</td>
                  <td className="py-1 text-red-700/80">{d.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-red-700">
            Recommended: use <strong>Deactivate</strong> or <strong>Suspend</strong> above instead of deleting.
            These retain the institution's history while ending its active access.
          </p>
        </div>
      )}

      {nonBlocking.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
          <p className="text-xs font-medium text-amber-800 mb-2">
            {blocking.length > 0 ? 'Additionally, the ' : 'The '}following records will be permanently deleted along with this organization:
          </p>
          <ul className="text-xs text-amber-700 space-y-0.5">
            {nonBlocking.map(d => (
              <li key={d.table}><span className="font-mono">{d.table}</span> — {d.record_count} row{d.record_count === 1 ? '' : 's'}</li>
            ))}
          </ul>
        </div>
      )}

      {report.safe_to_delete && (
        <div className="flex gap-2 items-end pt-2 border-t border-surface-100">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Type "{orgName}" to confirm</label>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} className="input input-sm" />
          </div>
          <button
            onClick={handleDelete}
            disabled={loading || confirmText !== orgName}
            className="btn-sm btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : 'Permanently delete'}
          </button>
        </div>
      )}
    </div>
  )
}