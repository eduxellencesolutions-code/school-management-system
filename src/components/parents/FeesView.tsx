'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, Wallet } from 'lucide-react'

interface Fee {
  termName: string | null
  totalExpected: number
  totalPaid: number
  outstanding: number
  dueDate: string | null
  updatedAt: string
}

export default function FeesView({ learnerId }: { learnerId: string }) {
  const [fees, setFees] = useState<Fee[]>([])
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
          setFees(data.fees ?? [])
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
        <p className="page-subtitle">Fee balance by term.</p>
      </div>

      {featureDisabled ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          Fee tracking is not enabled for this school.
        </div>
      ) : fees.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No fee records available yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {fees.map((f, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-ink flex items-center gap-2">
                  <Wallet size={15} className="text-brand-500" /> {f.termName ?? 'Term'}
                </p>
                {f.dueDate && (
                  <p className="text-xs text-ink-faint">Due {new Date(f.dueDate).toLocaleDateString('en-NG')}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-sm font-bold text-ink font-mono">₦{f.totalExpected.toLocaleString('en-NG')}</p>
                  <p className="text-[10px] text-ink-faint">Expected</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-green-600 font-mono">₦{f.totalPaid.toLocaleString('en-NG')}</p>
                  <p className="text-[10px] text-ink-faint">Paid</p>
                </div>
                <div>
                  <p className={`text-sm font-bold font-mono ${f.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₦{f.outstanding.toLocaleString('en-NG')}
                  </p>
                  <p className="text-[10px] text-ink-faint">Outstanding</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}