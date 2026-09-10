// FILE: src/app/student/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function StudentDashboardPage() {
  const supabase = createClient()
  const [record, setRecord] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.rpc('get_my_tertiary_academic_record')
      if (error) { setError(error.message); setLoading(false); return }
      setRecord(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-sm text-ink-faint">Loading…</p>
  if (error) return <div className="card p-6"><p className="text-sm text-red-600">{error}</p></div>
  if (!record) return null

  return (
    <div>
      <h1 className="page-title mb-1">Welcome, {record.profile.first_name}</h1>
      <p className="page-subtitle mb-6">{record.profile.programme_name} · {record.profile.department_name} · Level {record.profile.current_level}</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-6">
          <p className="text-xs text-ink-faint uppercase tracking-wider">Cumulative GPA</p>
          <p className="text-3xl font-bold text-ink">{record.cgpa.cgpa ?? '—'}</p>
        </div>
        <div className="card p-6">
          <p className="text-xs text-ink-faint uppercase tracking-wider">Total Credit Units</p>
          <p className="text-3xl font-bold text-ink">{record.cgpa.total_credit_units}</p>
        </div>
      </div>

      <Link href="/student/results" className="btn-primary btn">View full results</Link>
    </div>
  )
}