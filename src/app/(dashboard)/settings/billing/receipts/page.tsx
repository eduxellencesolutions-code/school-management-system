'use client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

const money = (n: any, cur: string) => new Intl.NumberFormat(cur === 'USD' ? 'en-US' : 'en-NG', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(Number(n))

export default function ReceiptsPage() {
  const supabase = createClient()
  const [rows, setRows] = useState<any[]>([])
  useEffect(() => { supabase.rpc('get_my_receipts').then(({ data, error }) => { if (error) toast.error(error.message); else setRows(data ?? []) }) }, [])
  return (
    <div className="max-w-3xl flex flex-col gap-4">
      <h1 className="page-title">Receipts</h1>
      {rows.length === 0 && <div className="card p-4 text-sm text-ink-muted">No receipts yet.</div>}
      {rows.map(r => (
        <div key={r.id} className="card p-5 text-sm flex flex-col gap-1 print:break-inside-avoid">
          <div className="flex justify-between"><b>{r.receipt_number}</b><span>{new Date(r.issued_at).toLocaleDateString('en-NG')}</span></div>
          <div>{r.account_name}{r.billing_country ? ` · ${r.billing_country}` : ''}{r.tax_id ? ` · Tax ID ${r.tax_id}` : ''}</div>
          <div>{r.description}{r.period_start ? ` · ${r.period_start} to ${r.period_end}` : ''}</div>
          {r.tax_applied && <div>Net {money(r.net_amount, r.currency)} · VAT {r.tax_rate}% {money(r.tax_amount, r.currency)}</div>}
          <div className="text-base font-semibold">Total paid {money(r.amount_paid, r.currency)}</div>
          <div className="text-xs text-ink-muted">{r.tax_note}</div>
          <button onClick={() => window.print()} className="btn-secondary btn-sm btn w-fit mt-2 print:hidden">Print</button>
        </div>))}
    </div>
  )
}