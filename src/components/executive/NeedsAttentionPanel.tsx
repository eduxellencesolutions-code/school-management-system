// src/components/executive/NeedsAttentionPanel.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

const SEVERITY_STYLE: Record<string, string> = {
  red: 'bg-red-500', amber: 'bg-amber-500', yellow: 'bg-yellow-400',
}

export default function NeedsAttentionPanel() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/executive/needs-attention').then(r => r.json()).then(d => setItems(d.items ?? [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="card p-4 flex justify-center"><Loader2 className="animate-spin" size={16} /></div>

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-semibold text-sm text-ink">🔔 Needs Your Attention</h2>
        <span className="text-xs text-ink-faint ml-auto">{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-ink-faint text-center py-4">All clear — no issues need your attention right now.</p>
      ) : (
        <div className="divide-y divide-surface-100">
          {items.map((item, i) => (
            <a key={i} href={item.href} className="py-2 flex items-center gap-3 text-sm hover:bg-surface-50 -mx-2 px-2 rounded">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${SEVERITY_STYLE[item.severity]}`} />
              <span className="text-ink flex-1">{item.label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}