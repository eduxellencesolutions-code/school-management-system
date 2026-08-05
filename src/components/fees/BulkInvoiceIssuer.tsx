'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, AlertTriangle, CheckCircle2, FilePlus2 } from 'lucide-react'

interface Term { id: string; name: string; sessionName: string }
interface Group { id: string; name: string }
interface FeeStructure { id: string; name: string; termId: string; groupId: string | null; groupName: string }

interface PreviewResult {
  studentCount: number
  alreadyInvoicedCount: number
  willSkip: number
  eligibleCount: number
  structureTotal: number
  totalValue: number
}

interface IssueResult {
  invoicesCreated: number
  skipped: number
  failed: number
  failedDetails: { learner_id: string; error: string }[]
}

export default function BulkInvoiceIssuer({
  terms,
  groups,
  structures,
  canOverride,
}: {
  terms: Term[]
  groups: Group[]
  structures: FeeStructure[]
  canOverride: boolean
}) {
  const [termId, setTermId] = useState(terms[0]?.id ?? '')
  const [structureId, setStructureId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [override, setOverride] = useState(false)

  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [result, setResult] = useState<IssueResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const structuresForTerm = useMemo(() => structures.filter((s) => s.termId === termId), [structures, termId])
  const selectedStructure = useMemo(() => structures.find((s) => s.id === structureId) ?? null, [structures, structureId])

  // If the structure is scoped to a specific class, the class picker is locked to it.
  useEffect(() => {
    if (selectedStructure?.groupId) {
      setGroupId(selectedStructure.groupId)
    } else if (selectedStructure && !groupId) {
      setGroupId(groups[0]?.id ?? '')
    }
  }, [selectedStructure])

  useEffect(() => {
    setStructureId('')
    setGroupId('')
    setPreview(null)
    setResult(null)
  }, [termId])

  useEffect(() => {
    setPreview(null)
    setResult(null)
    setError(null)
    if (!structureId || !groupId) return

    let cancelled = false
    setLoadingPreview(true)
    fetch(`/api/admin/finance/invoices/bulk-issue/preview?groupId=${groupId}&feeStructureId=${structureId}&override=${override}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.error) setError(data.error)
        else setPreview(data)
      })
      .finally(() => { if (!cancelled) setLoadingPreview(false) })

    return () => { cancelled = true }
  }, [structureId, groupId, override])

  async function issueInvoices() {
    if (!structureId || !groupId) return
    setIssuing(true)
    setError(null)
    setConfirming(false)
    const res = await fetch('/api/admin/finance/invoices/bulk-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, feeStructureId: structureId, override }),
    })
    const data = await res.json()
    if (data.success) {
      setResult({ invoicesCreated: data.invoicesCreated, skipped: data.skipped, failed: data.failed, failedDetails: data.failedDetails })
      setPreview(null)
    } else {
      setError(data.error ?? 'Failed to issue invoices.')
    }
    setIssuing(false)
  }

  const groupName = groups.find((g) => g.id === groupId)?.name ?? ''

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      {error && <div className="card p-4 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>}

      <div className="card p-5 flex flex-col gap-3">
        <div>
          <label className="text-xs font-semibold text-ink-muted">Term</label>
          <select value={termId} onChange={(e) => setTermId(e.target.value)} className="w-full mt-1 border border-surface-200 rounded px-2 py-1.5 text-sm">
            {terms.map((t) => (
              <option key={t.id} value={t.id}>{t.sessionName} · {t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-muted">Fee Structure</label>
          <select value={structureId} onChange={(e) => setStructureId(e.target.value)} className="w-full mt-1 border border-surface-200 rounded px-2 py-1.5 text-sm">
            <option value="">Select a fee structure...</option>
            {structuresForTerm.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.groupName})</option>
            ))}
          </select>
          {structuresForTerm.length === 0 && (
            <p className="text-xs text-ink-faint mt-1">No fee structures exist for this term yet. Create one first.</p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-muted">Class</label>
          {selectedStructure?.groupId ? (
            <p className="mt-1 text-sm text-ink py-1.5">{selectedStructure.groupName} <span className="text-xs text-ink-faint">(fixed by this fee structure)</span></p>
          ) : (
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={!selectedStructure} className="w-full mt-1 border border-surface-200 rounded px-2 py-1.5 text-sm">
              <option value="">Select a class...</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        {canOverride && (
          <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="w-3.5 h-3.5" />
            Override duplicate-invoice protection (issues a second invoice even to students who already have one)
          </label>
        )}
      </div>

      {loadingPreview && (
        <div className="card p-6 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
          <Loader2 size={15} className="animate-spin" /> Calculating preview...
        </div>
      )}

      {preview && !loadingPreview && (
        <div className="card p-5 flex flex-col gap-3">
          <p className="text-xs font-semibold text-ink-muted">Preview — {groupName}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-ink font-mono">{preview.eligibleCount}</p>
              <p className="text-[10px] text-ink-faint">Will receive invoices</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-600 font-mono">{preview.willSkip}</p>
              <p className="text-[10px] text-ink-faint">Will be skipped (duplicate)</p>
            </div>
            <div>
              <p className="text-lg font-bold text-ink font-mono">₦{preview.totalValue.toLocaleString('en-NG')}</p>
              <p className="text-[10px] text-ink-faint">Total value to be issued</p>
            </div>
          </div>

          {preview.willSkip > 0 && !override && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 flex items-start gap-1.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {preview.willSkip} student{preview.willSkip !== 1 ? 's' : ''} already {preview.willSkip !== 1 ? 'have' : 'has'} an invoice from this fee structure and will be skipped to prevent duplicates.
            </p>
          )}

          {preview.eligibleCount === 0 ? (
            <p className="text-xs text-ink-faint">No students to issue to — all students in this class already have an invoice from this structure.</p>
          ) : confirming ? (
            <div className="flex flex-col gap-2 border-t border-surface-100 pt-3">
              <p className="text-sm text-ink font-medium">
                Issue {preview.eligibleCount} invoice{preview.eligibleCount !== 1 ? 's' : ''} totaling ₦{preview.totalValue.toLocaleString('en-NG')} to {groupName}?
              </p>
              <div className="flex gap-2">
                <button onClick={issueInvoices} disabled={issuing} className="btn-primary btn-sm btn flex items-center gap-1.5">
                  {issuing ? <><Loader2 size={13} className="animate-spin" /> Issuing...</> : <><FilePlus2 size={13} /> Confirm & Issue</>}
                </button>
                <button onClick={() => setConfirming(false)} disabled={issuing} className="btn-secondary btn-sm btn">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="btn-primary btn-sm btn w-fit flex items-center gap-1.5">
              <FilePlus2 size={13} /> Issue Invoices
            </button>
          )}
        </div>
      )}

      {result && (
        <div className="card p-5 flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-green-600" /> Bulk issuance complete
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-green-600 font-mono">{result.invoicesCreated}</p>
              <p className="text-[10px] text-ink-faint">Created</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-600 font-mono">{result.skipped}</p>
              <p className="text-[10px] text-ink-faint">Skipped</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-600 font-mono">{result.failed}</p>
              <p className="text-[10px] text-ink-faint">Failed</p>
            </div>
          </div>
          {result.failed > 0 && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              {result.failed} student{result.failed !== 1 ? 's' : ''} failed and were not invoiced. Contact support with these details if this persists:
              <ul className="list-disc list-inside mt-1">
                {result.failedDetails.map((f, i) => <li key={i}>{f.error}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-ink-faint">
        New admissions or students transferred in after this bulk run can be invoiced individually from their student profile.
      </p>
    </div>
  )
}