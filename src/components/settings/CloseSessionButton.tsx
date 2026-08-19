'use client'
import { useState } from 'react'
import { closeSession } from '@/app/(dashboard)/settings/academic/actions'

export default function CloseSessionButton({ sessionId }: { sessionId: string }) {
  const [result, setResult] = useState<{ closed: boolean; blockers: any[] } | null>(null)
  const [loading, setLoading] = useState(false)

  async function attempt() {
    setLoading(true)
    const fd = new FormData()
    fd.set('session_id', sessionId)
    const res = await closeSession(fd)
    setLoading(false)
    if (res?.closed) {
      window.location.reload()
    } else if (res) {
      setResult(res)
    }
  }

  return (
    <div className="text-xs">
      <button onClick={attempt} disabled={loading} className="text-blue-600 hover:underline">
        {loading ? 'Checking…' : 'Close session'}
      </button>
      {result && !result.closed && (
        <div className="border border-red-200 bg-red-50 rounded p-2 mt-1 max-w-xs">
          <p className="font-medium text-red-700">Cannot close:</p>
          <ul className="list-disc list-inside text-red-600">
            {result.blockers.map((b, i) => <li key={i}>{b.message}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}