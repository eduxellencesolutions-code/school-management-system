'use client'
import { useState } from 'react'
import { closeTerm } from '@/app/(dashboard)/settings/academic/actions'

export default function CloseTermButton({ termId }: { termId: string }) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<{ closed: boolean; blockers: any[]; warnings: any[] } | null>(null)
  const [loading, setLoading] = useState(false)

  async function attempt(force: boolean) {
    setLoading(true)
    const fd = new FormData()
    fd.set('term_id', termId)
    fd.set('force', force ? 'true' : 'false')
    const res = await closeTerm(fd)
    setLoading(false)
    if (res?.closed) {
      setOpen(false)
      setResult(null)
      window.location.reload()
    } else if (res) {
      setResult(res)
    }
  }

  if (!open) {
    return <button onClick={() => { setOpen(true); attempt(false) }} className="text-xs text-blue-600 hover:underline">Close term</button>
  }

  return (
    <div className="text-xs">
      {loading && <span className="text-ink-faint">Checking…</span>}
      {result && !result.closed && (
        <div className="border border-amber-200 bg-amber-50 rounded p-2 mt-1 max-w-xs">
          {result.blockers.length > 0 && (
            <>
              <p className="font-medium text-red-700">Cannot close — blocking issues:</p>
              <ul className="list-disc list-inside text-red-600">
                {result.blockers.map((b, i) => <li key={i}>{b.message}</li>)}
              </ul>
            </>
          )}
          {result.warnings.length > 0 && (
            <>
              <p className="font-medium text-amber-700 mt-1">Warnings:</p>
              <ul className="list-disc list-inside text-amber-600">
                {result.warnings.map((w, i) => <li key={i}>{w.message}</li>)}
              </ul>
            </>
          )}
          <div className="flex gap-2 mt-2">
            {result.blockers.length === 0 && (
              <button onClick={() => attempt(true)} className="btn-primary btn-sm btn">Close anyway</button>
            )}
            <button onClick={() => { setOpen(false); setResult(null) }} className="btn-sm btn">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}