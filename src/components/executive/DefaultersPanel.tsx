// src/components/executive/DefaultersPanel.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2, Phone } from 'lucide-react'

function naira(n: number) {
  return `₦${Math.round(n).toLocaleString('en-NG')}`
}

export default function DefaultersPanel({ groupId, className, onClose }: { groupId: string | null; className: string | null; onClose: () => void }) {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return
    setLoading(true)
    fetch(`/api/executive/defaulters?groupId=${groupId}`)
      .then(r => r.json())
      .then(d => setStudents(d.students ?? []))
      .finally(() => setLoading(false))
  }, [groupId])

  if (!groupId) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg p-5 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-sm text-ink mb-3">Defaulters — {className}</h3>
        {loading ? <div className="flex justify-center p-6"><Loader2 className="animate-spin" size={18} /></div> : (
          <div className="divide-y divide-surface-100">
            {students.map((s: any) => (
              <div key={s.learner_id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-ink">{s.last_name} {s.first_name}</p>
                  <p className="text-xs text-ink-faint">{s.admission_number ?? '—'}</p>
                  {s.guardian_phone && (
                    <a href={`tel:${s.guardian_phone}`} className="text-xs text-brand-600 flex items-center gap-1 mt-0.5">
                      <Phone size={11} /> {s.guardian_phone}
                    </a>
                  )}
                </div>
                <span className="font-mono text-red-600 font-semibold">{naira(s.outstanding)}</span>
              </div>
            ))}
            {students.length === 0 && <p className="text-xs text-ink-faint text-center py-6">No outstanding balances in this class.</p>}
          </div>
        )}
        <button onClick={onClose} className="btn-secondary btn-sm btn w-full mt-4">Close</button>
      </div>
    </div>
  )
}