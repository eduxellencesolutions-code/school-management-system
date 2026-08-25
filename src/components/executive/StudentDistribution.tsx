// src/components/executive/StudentDistribution.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

const SECTION_LABELS: Record<string, string> = {
  nursery: 'Nursery', primary: 'Primary', secondary: 'Secondary', unassigned: 'Unassigned Section',
}

export default function StudentDistribution() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/executive/student-distribution').then(r => r.json()).then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" size={20} /></div>
  if (!data || data.error) return null

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-sm text-ink mb-3">Student Distribution</h2>
      <div className="flex flex-col gap-2">
        {data.by_section.map((s: any) => (
          <div key={s.section}>
            <button
              onClick={() => setExpandedSection(expandedSection === s.section ? null : s.section)}
              className="w-full flex items-center justify-between px-3 py-2 bg-surface-50 rounded text-sm hover:bg-surface-100"
            >
              <span>{SECTION_LABELS[s.section] ?? s.section}</span>
              <span className="font-mono font-semibold">{s.count}</span>
            </button>
            {expandedSection === s.section && (
              <div className="pl-4 mt-1 flex flex-col gap-1">
                {data.by_class
                  .filter((c: any) => (c.section ?? 'unassigned') === s.section)
                  .map((c: any) => (
                    <div key={c.group_id} className="flex justify-between text-xs text-ink-muted py-1">
                      <span>{c.class_name}{c.arm ? ` ${c.arm}` : ''}</span>
                      <span className="font-mono">{c.count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
        {data.by_section.length === 0 && <p className="text-xs text-ink-faint text-center py-4">No students enrolled yet.</p>}
      </div>
    </div>
  )
}