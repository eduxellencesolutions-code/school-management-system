// src/components/executive/StudentMovement.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2, UserPlus, UserMinus, ArrowRightCircle, GraduationCap, UserX } from 'lucide-react'

export default function StudentMovement() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/executive/student-movement').then(r => r.json()).then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" size={20} /></div>
  if (!data || data.error) return null

  const maxPop = Math.max(...data.population_by_term.map((t: any) => t.population), 1)

  const cards = [
    { label: 'New This Term', value: data.new_this_term, icon: UserPlus, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Withdrawn', value: data.withdrawn, icon: UserMinus, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Transferred', value: data.transferred, icon: ArrowRightCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Graduated', value: data.graduated, icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Currently Inactive', value: data.currently_inactive, icon: UserX, color: 'text-ink-muted', bg: 'bg-surface-100' },
  ]

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-sm text-ink mb-3">🚪 Student Movement</h2>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="text-center">
            <div className={`w-8 h-8 rounded ${bg} flex items-center justify-center mb-1.5 mx-auto`}>
              <Icon size={15} className={color} />
            </div>
            <div className="text-lg font-bold text-ink">{value}</div>
            <div className="text-xs text-ink-muted">{label}</div>
          </div>
        ))}
      </div>

      {data.population_by_term.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ink-muted mb-2">Population Trend</p>
          <div className="flex items-end gap-3 h-24">
            {data.population_by_term.map((t: any) => (
              <div key={t.term_id} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-mono text-ink">{t.population}</span>
                <div className="w-full bg-brand-500 rounded-t" style={{ height: `${(t.population / maxPop) * 60}px` }} />
                <span className="text-[10px] text-ink-faint text-center">{t.term_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}