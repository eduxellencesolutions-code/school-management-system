'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function GatewayTestPanel() {
  const supabase = createClient()
  const [runs, setRuns] = useState<any[]>([])
  const [gateway, setGateway] = useState('paystack')
  const [currency, setCurrency] = useState('USD')
  const [amount, setAmount] = useState('5')
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_gateway_test_runs')
    if (error) toast.error(error.message); else setRuns(data ?? [])
  }, [])
  useEffect(() => { load() }, [load])
  async function start() {
    const res = await fetch('/api/admin/gateway-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gateway, currency, amount: Number(amount) }) })
    const data = await res.json()
    if (data.paymentLink) window.location.href = data.paymentLink; else toast.error(data.error ?? 'Failed')
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="card p-4 flex flex-wrap gap-2 items-end">
        <select className="input w-40" value={gateway} onChange={e => setGateway(e.target.value)}><option value="paystack">Paystack</option><option value="flutterwave">Flutterwave</option></select>
        <select className="input w-28" value={currency} onChange={e => setCurrency(e.target.value)}><option>USD</option><option>NGN</option></select>
        <input className="input w-28" value={amount} onChange={e => setAmount(e.target.value)} />
        <button onClick={start} className="btn-primary btn">Start test payment</button>
        <p className="text-xs text-ink-muted w-full">Maximum 50 in any currency. Charges a real card on live keys, so refund it afterwards. It changes no subscription.</p>
      </div>
      <div className="card divide-y divide-surface-100">
        {runs.map(r => (
          <div key={r.id} className="p-3 text-xs">
            <b>{r.gateway} {r.currency} {r.amount}</b> · {r.status} · verified {r.verified_amount ?? '—'} {r.verified_currency ?? ''} · webhook {r.webhook_received_at ? 'received' : 'not yet'} · {r.reference}
          </div>))}
      </div>
    </div>
  )
}