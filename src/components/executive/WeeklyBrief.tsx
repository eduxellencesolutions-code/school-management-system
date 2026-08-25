// src/components/executive/WeeklyBrief.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

function naira(n: number) {
  return `₦${Math.round(n).toLocaleString('en-NG')}`
}

export default function WeeklyBrief() {
  const [briefs, setBriefs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/executive/weekly-briefs').then(r => r.json()).then(d => setBriefs(d.briefs ?? [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" size={20} /></div>
  if (briefs.length === 0) return <p className="text-sm text-ink-faint p-4">No weekly briefs generated yet — the first one is created automatically each Sunday night.</p>

  const b = briefs[0].brief_data

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-sm text-ink mb-1">📊 Weekly School Brief</h2>
      <p className="text-xs text-ink-faint mb-4">Week ending {new Date(briefs[0].week_ending).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div>👨‍🎓 Student population: <strong>{b.active_students}</strong></div>
        <div>📈 New students: <strong>+{b.new_students}</strong></div>
        <div>🚪 Students leaving: <strong>-{b.students_leaving}</strong></div>
        <div>💰 Fees collected: <strong>{naira(b.fees_collected_this_week)}</strong></div>
        <div>💰 Outstanding: <strong>{naira(b.fees_outstanding)}</strong></div>
        <div>📅 Average attendance: <strong>{b.average_attendance_this_week ?? '—'}%</strong></div>
        <div>⚠️ Requiring follow-up: <strong>{b.students_requiring_followup}</strong></div>
        <div>📚 Classes requiring attention: <strong>{b.classes_requiring_attention}</strong></div>
      </div>

      {b.key_attention_areas?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink-muted mb-1">Key Attention Areas</p>
          <ol className="text-xs text-ink-muted list-decimal list-inside flex flex-col gap-0.5">
            {b.key_attention_areas.map((area: string, i: number) => <li key={i}>{area}</li>)}
          </ol>
        </div>
      )}
    </div>
  )
}