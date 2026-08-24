// src/components/executive/ClassHealthTable.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'

function naira(n: number) {
  return `₦${Math.round(n).toLocaleString('en-NG')}`
}

export default function ClassHealthTable({ onSelectClass }: { onSelectClass: (groupId: string, className: string) => void }) {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/executive/class-health')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setClasses(d.classes ?? []) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" size={20} /></div>
  if (error) return <p className="text-sm text-ink-muted p-4">{error}</p>

  return (
    <div className="card overflow-hidden">
      <div className="card-header"><h2 className="font-semibold text-sm text-ink">Class Health</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Class</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Students</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Attendance</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Fees Collected</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Outstanding</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Withdrawn</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c: any) => {
              const attendanceWarn = c.attendance_percentage !== null && c.attendance_percentage < 85
              const feesWarn = c.fees_collection_rate !== null && c.fees_collection_rate < 75
              return (
                <tr key={c.group_id} onClick={() => onSelectClass(c.group_id, c.class_name)} className="border-b border-surface-100 hover:bg-surface-50 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-ink flex items-center gap-1.5">
                    {c.class_name}
                    {(attendanceWarn || feesWarn) && <AlertTriangle size={13} className="text-amber-500" />}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">{c.total_students}</td>
                  <td className={`px-4 py-3 text-center font-mono ${attendanceWarn ? 'text-amber-600 font-semibold' : ''}`}>
                    {c.attendance_percentage !== null ? `${c.attendance_percentage}%` : '—'}
                  </td>
                  <td className={`px-4 py-3 text-center font-mono ${feesWarn ? 'text-amber-600 font-semibold' : ''}`}>
                    {c.fees_collection_rate !== null ? `${c.fees_collection_rate}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-red-600">{naira(c.fees_outstanding)}</td>
                  <td className="px-4 py-3 text-center font-mono">{c.withdrawn_this_term}</td>
                </tr>
              )
            })}
            {classes.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-faint text-sm">No classes found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}