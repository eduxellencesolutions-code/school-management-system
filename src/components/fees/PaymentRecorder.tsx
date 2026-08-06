'use client'

import { useState, useEffect } from 'react'
import { Loader2, CreditCard, Ban, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ClassOption { id: string; name: string }
interface Learner { id: string; first_name: string; last_name: string }
interface LineItem { id: string; description: string; amount: number; dueDate: string | null; categoryName: string }
interface Payment { id: string; amount: number; method: string; reference: string | null; paid_date: string; status: string; voided: boolean; void_reason: string | null }
interface Balance { totalCharged: number; totalAdjusted: number; totalPaid: number; outstanding: number }

export default function PaymentRecorder({ classes, termId, canVoid }: { classes: ClassOption[]; termId: string | null; canVoid: boolean }) {
  const supabase = createClient()
  const [groupId, setGroupId] = useState(classes[0]?.id ?? '')
  const [learners, setLearners] = useState<Learner[]>([])
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null)

  const [hasAccount, setHasAccount] = useState(true)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0])

  const [loadingLearners, setLoadingLearners] = useState(false)
  const [loadingLedger, setLoadingLedger] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    if (!groupId) return
    setLoadingLearners(true)
    setSelectedLearnerId(null)
    supabase.from('learners').select('id, first_name, last_name').eq('group_id', groupId).eq('is_active', true).order('last_name')
      .then(({ data }) => { setLearners(data ?? []); setLoadingLearners(false) })
  }, [groupId])

  async function selectLearner(learnerId: string) {
    setSelectedLearnerId(learnerId)
    if (!termId) return
    setLoadingLedger(true)
    setError(null)
    setWarning(null)

    const res = await fetch(`/api/admin/finance/student-ledger?learnerId=${learnerId}&termId=${termId}`)
    const data = await res.json()
    if (data.error) {
      setError(data.error)
    } else if (!data.hasAccount) {
      setHasAccount(false)
    } else {
      setHasAccount(true)
      setAccountId(data.accountId)
      setLineItems(data.lineItems)
      setPayments(data.payments)
      setBalance(data.balance)
    }
    setLoadingLedger(false)
  }

  async function refreshLedger() {
    if (selectedLearnerId) await selectLearner(selectedLearnerId)
  }

  async function recordPayment() {
    if (!accountId || !amount) return
    setSaving(true)
    setError(null)
    setWarning(null)
    const res = await fetch('/api/admin/finance/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, amount: Number(amount), method, reference: reference || null, paidDate }),
    })
    const data = await res.json()
    if (data.success) {
      setAmount(''); setReference('')
      if (data.warning) setWarning(data.warning)
      await refreshLedger()
    } else {
      setError(data.error ?? 'Failed to record payment.')
    }
    setSaving(false)
  }

  async function voidPayment(paymentId: string) {
    const reason = prompt('Reason for voiding this payment?')
    if (!reason) return
    const res = await fetch(`/api/admin/finance/payments/${paymentId}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    const data = await res.json()
    if (data.success) await refreshLedger()
    else setError(data.error ?? 'Failed to void payment.')
  }

  if (!termId) {
    return <div className="card p-8 text-center text-sm text-ink-muted">No current academic term is set.</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-5 flex items-center gap-4">
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="border border-surface-200 rounded px-2 py-1.5 text-sm">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {error && <div className="card p-4 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>}
      {warning && (
        <div className="card p-4 text-sm text-amber-700 bg-amber-50 border-amber-100 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {warning}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-sm text-ink">Students</h2></div>
          {loadingLearners ? (
            <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading...</div>
          ) : (
            <div className="divide-y divide-surface-100 max-h-[500px] overflow-y-auto">
              {learners.map((l) => (
                <button key={l.id} onClick={() => selectLearner(l.id)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedLearnerId === l.id ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-surface-50 text-ink'}`}>
                  {l.last_name} {l.first_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          {!selectedLearnerId ? (
            <div className="card p-8 text-center text-sm text-ink-muted">Select a student to record a payment.</div>
          ) : loadingLedger ? (
            <div className="card p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading...</div>
          ) : !hasAccount ? (
            <div className="card p-8 text-center text-sm text-ink-muted">
              This student has no fee account for this term yet. Issue an invoice first from the Issue Invoices page.
            </div>
          ) : (
            <>
              {balance && (
                <div className="card p-4 grid grid-cols-4 gap-2 text-center">
                  <div><p className="text-base font-bold text-ink font-mono">₦{balance.totalCharged.toLocaleString('en-NG')}</p><p className="text-[10px] text-ink-faint">Charged</p></div>
                  <div><p className="text-base font-bold text-ink font-mono">₦{balance.totalAdjusted.toLocaleString('en-NG')}</p><p className="text-[10px] text-ink-faint">Adjusted</p></div>
                  <div><p className="text-base font-bold text-green-600 font-mono">₦{balance.totalPaid.toLocaleString('en-NG')}</p><p className="text-[10px] text-ink-faint">Paid</p></div>
                  <div><p className={`text-base font-bold font-mono ${balance.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>₦{balance.outstanding.toLocaleString('en-NG')}</p><p className="text-[10px] text-ink-faint">Outstanding</p></div>
                </div>
              )}

              {lineItems.length > 0 && (
                <div className="card">
                  <div className="card-header"><h2 className="font-semibold text-sm text-ink">Invoice Items</h2></div>
                  <div className="divide-y divide-surface-100">
                    {lineItems.map((item) => (
                      <div key={item.id} className="px-4 py-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-ink">{item.description} <span className="text-xs text-ink-faint">({item.categoryName})</span></p>
                          <p className="text-xs text-ink-faint">
                            {item.dueDate ? `Due ${new Date(item.dueDate).toLocaleDateString('en-NG')}` : 'No due date'}
                          </p>
                        </div>
                        <span className="font-mono text-sm text-ink">₦{item.amount.toLocaleString('en-NG')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card p-4 flex flex-col gap-2">
                <p className="text-xs font-semibold text-ink-muted">Record Payment</p>
                <div className="flex gap-2 flex-wrap">
                  <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="w-28 border border-surface-200 rounded px-2 py-1.5 text-sm" />
                  <select value={method} onChange={(e) => setMethod(e.target.value)} className="border border-surface-200 rounded px-2 py-1.5 text-sm">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                  </select>
                  <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)}
                    className="border border-surface-200 rounded px-2 py-1.5 text-sm" />
                  <input type="text" placeholder="Reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)}
                    className="flex-1 min-w-[140px] border border-surface-200 rounded px-2 py-1.5 text-sm" />
                  <button onClick={recordPayment} disabled={saving || !amount} className="btn-primary btn-sm btn flex items-center gap-1">
                    <CreditCard size={13} /> {saving ? 'Recording...' : 'Record'}
                  </button>
                </div>
                <p className="text-[11px] text-ink-faint">Payments are automatically applied to the oldest unpaid item first.</p>
              </div>

              <div className="card">
                <div className="card-header"><h2 className="font-semibold text-sm text-ink">Payment History</h2></div>
                <div className="divide-y divide-surface-100">
                  {payments.length === 0 ? (
                    <p className="p-4 text-sm text-ink-muted text-center">No payments recorded yet.</p>
                  ) : payments.map((p) => (
                    <div key={p.id} className={`px-4 py-2.5 flex items-center justify-between ${p.voided ? 'opacity-50' : ''}`}>
                      <div>
                        <p className="text-sm text-ink">₦{p.amount.toLocaleString('en-NG')} · {p.method}</p>
                        <p className="text-xs text-ink-faint">
                          {new Date(p.paid_date).toLocaleDateString('en-NG')}
                          {p.reference && ` · ${p.reference}`}
                          {p.voided && ` · VOIDED${p.void_reason ? `: ${p.void_reason}` : ''}`}
                        </p>
                      </div>
                      {!p.voided && canVoid && (
                        <button onClick={() => voidPayment(p.id)} className="text-ink-faint hover:text-red-600" title="Void payment">
                          <Ban size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}