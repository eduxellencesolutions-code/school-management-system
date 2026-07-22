'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function ParentAccessPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/parents/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    const data = await res.json()

    if (data.success && data.actionLink) {
      // Sends the browser to Supabase's verification URL, which sets the real session
      // cookie and redirects back into the app — the parent never sees a password screen.
      window.location.href = data.actionLink
    } else {
      setError(data.error ?? 'Could not verify this code.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <div className="card p-8 w-full max-w-sm">
        <h1 className="text-lg font-bold text-ink text-center mb-1">Eduxellence Results</h1>
        <p className="text-sm text-ink-muted text-center mb-6">
          Enter your Parent Access Code to view your children's results.
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. K7M2QX"
            maxLength={6}
            className="border border-surface-200 rounded px-3 py-2.5 text-center text-lg font-mono tracking-widest uppercase"
            autoFocus
          />

          {error && <p className="text-xs text-red-600 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length < 4}
            className="btn-primary btn flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? 'Verifying...' : 'View Results'}
          </button>
        </form>
      </div>
    </div>
  )
}
