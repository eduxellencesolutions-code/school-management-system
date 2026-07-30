'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'

export default function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    setLoading(true)
    const timeout = setTimeout(() => {
      fetch(`/api/platform-staff/search?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(d => { setResults(d.results ?? []); setOpen(true) })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const TYPE_LABELS: Record<string, string> = {
    school: 'School', solo_teacher: 'Solo Teacher', representative: 'Representative', ticket: 'Ticket',
  }

  return (
    <div className="relative w-80" ref={ref}>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search schools, teachers, reps, tickets..."
          className="w-full pl-9 pr-3 py-1.5 border border-surface-200 rounded text-sm"
        />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink-faint" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-surface-200 rounded shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => { router.push(r.href); setOpen(false); setQuery('') }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-surface-50 flex items-center justify-between"
            >
              <span>{r.label}</span>
              <span className="text-[10px] text-ink-faint uppercase">{TYPE_LABELS[r.type]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}