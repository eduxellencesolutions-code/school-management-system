'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function TopupPanel() {
  const supabase = createClient()
  const [rows, setRows] = useState<any[]>([])
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_topup_overview'); if (error) toast.error(error.message); else setRows(data ?? [])
  }, [])
  useEffect(() => { load() }, [load])
  async function act(fn: 'resolve_topup_dispute' | 'cancel_topup_quote', id: string, choice?: string) {
    const note = window.prompt(`Note for "${choice ?? 'cancel'}" (required):`); if (!note?.trim()) return
    const args = fn === 'resolve_topup_dispute' ? { p_quote_id: id, p_decision: choice, p_note: note } : { p_quote_id: id, p_reason: note }
    const { error } = await supabase.rpc(fn, args); if (error) toast.error(error.message); else { toast.success('Recorded'); load() }
  }
  return (
    <div className="card divide-y divide-surface-100">
      {rows.length === 0 && <p className="p-4 text-sm text-ink-muted">No top-up quotes.</p>}
      {rows.map(r => (
        <div key={r.id} className="p-3 text-sm flex flex-col gap-1">
          <p className="font-medium">{r.organization} · {r.currency} {r.amount_due} → {r.target_plan} · <span className={r.overdue ? 'text-red-600' : ''}>{r.overdue ? 'overdue' : r.status}</span></p>
          <p className="text-xs text-ink-muted">Verified {r.verified_count} (limit {r.tolerance_limit}) · issued {String(r.issued_at).slice(0, 10)} · due {String(r.due_at).slice(0, 10)}{r.dispute_reason ? ` · dispute: ${r.dispute_reason}` : ''}</p>
          <div className="flex gap-2">
            {r.status === 'disputed' && ['upheld', 'rejected'].map(c => <button key={c} onClick={() => act('resolve_topup_dispute', r.id, c)} className="btn-secondary btn-sm btn">Dispute {c}</button>)}
            {['issued', 'disputed'].includes(r.status) && <button onClick={() => act('cancel_topup_quote', r.id)} className="btn-secondary btn-sm btn">Cancel quote</button>}
          </div>
        </div>))}
    </div>
  )
}