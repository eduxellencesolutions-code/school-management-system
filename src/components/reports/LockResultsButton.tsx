'use client'

import { useState } from 'react'
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  groupId: string
  sessionId: string
  termId: string
}

export default function LockResultsButton({ groupId, sessionId, termId }: Props) {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [problems, setProblems] = useState<string[] | null>(null)
  const [ready, setReady] = useState(false)
  const [locking, setLocking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function checkReadiness() {
    setChecking(true)
    setError(null)
    setProblems(null)

    try {
      const res = await fetch('/api/reports/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, sessionId, termId, dryRun: true }),
      })
      const data = await res.json()

      if (data.ready) {
        setReady(true)
      } else {
        setProblems(data.problems ?? [data.error])
      }
    } catch {
      setError('Could not check readiness. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  async function confirmLock() {
    setLocking(true)
    setError(null)

    try {
      const res = await fetch('/api/reports/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, sessionId, termId }),
      })
      const data = await res.json()

      if (data.success) {
        router.refresh()
      } else {
        setError(data.error ?? 'Failed to lock results.')
      }
    } catch {
      setError('Could not lock results. Please try again.')
    } finally {
      setLocking(false)
    }
  }

  if (ready) {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
          <CheckCircle2 size={13} /> All checks passed
        </div>
        <button
          onClick={confirmLock}
          disabled={locking}
          className="btn-primary btn-sm btn flex items-center gap-1.5"
        >
          <Lock size={13} />
          {locking ? 'Locking...' : 'Confirm Lock'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-2 max-w-xs">
      {problems && problems.length > 0 && (
        <ul className="text-xs text-red-600 text-right space-y-0.5">
          {problems.map((p, i) => (
            <li key={i} className="flex items-start gap-1 justify-end">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={checkReadiness}
        disabled={checking}
        className="btn-secondary btn-sm btn flex items-center gap-1.5"
      >
        <Lock size={13} />
        {checking ? 'Checking...' : 'Check Readiness'}
      </button>
    </div>
  )
}
