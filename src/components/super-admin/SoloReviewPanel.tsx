'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function SoloReviewPanel() {
  const supabase = createClient()
  const [rows, setRows] = useState<any[]>([])
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_solo_review_queue'); if (error) toast.error(error.message); else setRows(data ?? [])
  }, [])
  useEffect(() => { load() }, [load])
  async function resolve(id: string, decision: 'apply' | 'reject') {
    const evidence = window.prompt('Evidence reference (gateway dashboard transaction ID or screenshot link):'); if (!evidence?.trim()) return
    const note = window.prompt(`Note for "${decision}":`); if (!note?.trim()) return
    const { data, error } = await supabase.rpc('resolve_solo_payment_review', { p_payment_id: id, p_decision: decision, p_evidence_ref: evidence, p_note: note })
    if (error) toast.error(error.message); else { toast.success(data?.next_step ?? 'Recorded'); load() }
  }
  return (
    <div className="card divide-y divide-surface-100">
      {rows.length === 0 && <p className="p-4 text-sm text-ink-muted">No solo payments awaiting review.</p>}
      {rows.map(r => (
        <div key={r.id} className="p-3 text-sm flex flex-col gap-1">
          <p className="font-medium">{r.name} ({r.email}) · {r.currency} {r.amount} · {r.billing_cycle}</p>
          <p className="text-xs text-ink-muted">Reason: {r.review_reason} · declared country {r.billing_country ?? '—'} · card country {r.payer_country ?? 'not available'} ({r.country_check}) · {r.provider} {r.reference}</p>
          <div className="flex gap-2">
            <button onClick={() => resolve(r.id, 'apply')} className="btn-secondary btn-sm btn">Apply after checking</button>
            <button onClick={() => resolve(r.id, 'reject')} className="btn-secondary btn-sm btn">Reject (refund in the gateway)</button>
          </div>
        </div>))}
    </div>
  )
}