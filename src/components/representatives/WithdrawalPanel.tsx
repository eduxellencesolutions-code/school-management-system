'use client'

import { useState } from 'react'
import { Loader2, Wallet, Landmark } from 'lucide-react'

const MIN_WITHDRAWAL = 5000

export default function WithdrawalPanel({
  wallet,
  bankAccounts,
  withdrawals,
  onRefresh,
}: {
  wallet: { totalEarned: number; pending: number; available: number; withdrawn: number; walletBalance: number }
  bankAccounts: any[]
  withdrawals: any[]
  onRefresh: () => void
}) {
  const [showBankForm, setShowBankForm] = useState(bankAccounts.length === 0)
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [savingBank, setSavingBank] = useState(false)

  const [amount, setAmount] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const primaryBank = bankAccounts.find(b => b.is_primary)

  async function saveBankAccount() {
    if (!bankName || !accountNumber || !accountName) {
      setMessage({ type: 'error', text: 'All bank fields are required' })
      return
    }
    setSavingBank(true)
    setMessage(null)
    const res = await fetch('/api/representatives/bank-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankName, accountNumber, accountName }),
    })
    const json = await res.json()
    setSavingBank(false)
    if (json.error) {
      setMessage({ type: 'error', text: json.error })
    } else {
      setMessage({ type: 'success', text: 'Bank account saved' })
      setShowBankForm(false)
      onRefresh()
    }
  }

  async function requestWithdrawal() {
    const numAmount = Number(amount)
    if (!numAmount || numAmount < MIN_WITHDRAWAL) {
      setMessage({ type: 'error', text: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}` })
      return
    }
    if (!primaryBank) {
      setMessage({ type: 'error', text: 'Please save a bank account first' })
      return
    }
    setRequesting(true)
    setMessage(null)
    const res = await fetch('/api/representatives/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: numAmount, bankAccountId: primaryBank.id }),
    })
    const json = await res.json()
    setRequesting(false)
    if (json.error) {
      setMessage({ type: 'error', text: json.error })
    } else {
      setMessage({ type: 'success', text: 'Withdrawal requested successfully' })
      setAmount('')
      onRefresh()
    }
  }

  const statusBadgeClass: Record<string, string> = {
    paid: 'badge-green',
    approved: 'badge-blue',
    pending: 'badge-gray',
    under_review: 'badge-gray',
    rejected: 'badge-red',
    cancelled: 'badge-gray',
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Wallet breakdown */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={14} className="text-brand-500" />
          <p className="text-sm font-medium text-ink">Wallet</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="text-center">
            <p className="text-lg font-bold">₦{wallet.totalEarned.toLocaleString()}</p>
            <p className="text-xs text-ink-faint">Total Earned</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">₦{wallet.pending.toLocaleString()}</p>
            <p className="text-xs text-ink-faint">Pending (holding)</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-brand-600">₦{wallet.available.toLocaleString()}</p>
            <p className="text-xs text-ink-faint">Available</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">₦{wallet.withdrawn.toLocaleString()}</p>
            <p className="text-xs text-ink-faint">Total Withdrawn</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">₦{wallet.walletBalance.toLocaleString()}</p>
            <p className="text-xs text-ink-faint">Wallet Balance</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`text-sm px-3 py-2 rounded ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message.text}
        </div>
      )}

      {/* Bank account */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Landmark size={14} className="text-brand-500" />
            <p className="text-sm font-medium text-ink">Bank Account</p>
          </div>
          {primaryBank && !showBankForm && (
            <button onClick={() => setShowBankForm(true)} className="text-xs text-brand-500 hover:underline">
              Change
            </button>
          )}
        </div>

        {primaryBank && !showBankForm ? (
          <div className="text-sm text-ink-muted">
            <p>{primaryBank.bank_name}</p>
            <p className="font-mono text-xs">{primaryBank.account_number} · {primaryBank.account_name}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              className="input"
              placeholder="Bank name"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
            />
            <input
              className="input"
              placeholder="Account number"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
            />
            <input
              className="input"
              placeholder="Account name"
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
            />
            <button onClick={saveBankAccount} disabled={savingBank} className="btn-primary btn-sm btn self-start flex items-center gap-1.5">
              {savingBank && <Loader2 size={14} className="animate-spin" />}
              Save Bank Account
            </button>
          </div>
        )}
      </div>

      {/* Withdrawal request */}
      <div className="card p-4">
        <p className="text-sm font-medium text-ink mb-2">Request Withdrawal</p>
        <p className="text-xs text-ink-faint mb-3">
          Minimum ₦{MIN_WITHDRAWAL.toLocaleString()}. Available balance: ₦{wallet.available.toLocaleString()}
        </p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <button
            onClick={requestWithdrawal}
            disabled={requesting}
            className="btn-primary btn-sm btn flex items-center gap-1.5"
          >
            {requesting && <Loader2 size={14} className="animate-spin" />}
            Request
          </button>
        </div>
        <button
          onClick={() => setAmount(String(wallet.available))}
          className="text-xs text-brand-500 hover:underline mt-2"
        >
          Withdraw entire available balance
        </button>
      </div>

      {/* Withdrawal history */}
      <div className="card">
        <div className="card-header font-semibold text-sm">Withdrawal History</div>
        <div className="divide-y divide-surface-100">
          {withdrawals.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted text-center">No withdrawals yet.</p>
          ) : withdrawals.map((w: any) => (
            <div key={w.id} className="p-3 flex justify-between items-center text-sm">
              <div>
                <p>₦{Number(w.amount_requested).toLocaleString()}</p>
                <p className="text-xs text-ink-faint">
                  {new Date(w.date_requested).toLocaleDateString('en-NG')}
                  {w.rejection_reason && ` · ${w.rejection_reason}`}
                </p>
              </div>
              <span className={`badge text-[10px] ${statusBadgeClass[w.status] ?? 'badge-gray'}`}>{w.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}