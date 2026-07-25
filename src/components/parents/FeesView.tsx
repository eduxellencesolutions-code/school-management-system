'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, Wallet } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  method: string
  paid_date: string
  status: string
}

interface Account {
  termName: string | null
  balance: { totalCharged: number; totalAdjusted: number; totalPaid: number; outstanding: number }
  payments: Payment[]
}

export default function FeesView({ learnerId }: { learnerId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [featureDisabled, setFeatureDisabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/parents/fees?learnerId=${learnerId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setAccounts(data.accounts ?? [])
          setFeatureDisabled(!!data.featureDisabled)
        }
      })
      .catch(() => setError('Could not load fee information.'))
      .finally(() => setLoading(false))
  }, [learnerId])

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading fees...
      </div>
    )
  }

  if (error) {
    return <div className="card p-6 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/parent/dashboard" className="text-sm text-brand-500 hover:underline flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <div>
        <h1 className="page-title">Fees</h1>
        <p className="page-subtitle">Fee balance and payment history by term.</p>
      </div>

      {featureDisabled ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          Fee tracking is not enabled for this school.
        </div>
      ) : accounts.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No fee records available yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((acc, i) => {
            const { totalCharged, totalPaid, outstanding } = acc.balance
            const percentPaid = totalCharged > 0 ? Math.min(100, Math.max(0, (totalPaid / totalCharged) * 100)) : 0

            return (
              <div key={i} className="card p-5">
                <p className="text-sm font-semibold text-ink flex items-center gap-2 mb-3">
                  <Wallet size={15} className="text-brand-500" /> {acc.termName ?? 'Term'}
                </p>

                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                  <div>
                    <p className="text-sm font-bold text-ink font-mono">₦{totalCharged.toLocaleString('en-NG')}</p>
                    <p className="text-[10px] text-ink-faint">Total Fee</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-600 font-mono">₦{totalPaid.toLocaleString('en-NG')}</p>
                    <p className="text-[10px] text-ink-faint">Paid</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold font-mono ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₦{outstanding.toLocaleString('en-NG')}
                    </p>
                    <p className="text-[10px] text-ink-faint">Outstanding</p>
                  </div>
                </div>

                <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-brand-500" style={{ width: `${percentPaid}%` }} />
                </div>

                {acc.payments.length > 0 && (
                  <div className="border-t border-surface-100 pt-3">
                    <p className="text-xs font-semibold text-ink-muted mb-2">Payment History</p>
                    <div className="flex flex-col gap-2">
                      {acc.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <span className="text-ink">₦{p.amount.toLocaleString('en-NG')} · {p.method}</span>
                          <span className="text-xs text-ink-faint">
                            {new Date(p.paid_date).toLocaleDateString('en-NG')}
                            {p.status === 'pending' && ' · Awaiting confirmation'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}