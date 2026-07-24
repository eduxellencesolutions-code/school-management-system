'use client'

import { useState, useEffect } from 'react'
import { Loader2, User, CalendarCheck, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface Child {
  id: string
  name: string
  admissionNumber: string | null
  className: string | null
  average: number | null
  attendanceRate: number | null
}

export default function ParentDashboard() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/parents/children')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setChildren(data.children ?? [])
        }
      })
      .catch(() => setError('Could not load your children.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading...
      </div>
    )
  }

  if (error) {
    return <div className="card p-6 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>
  }

  if (children.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-ink-muted">
        No children are currently linked to your account. Please contact your school.
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {children.map((child) => (
        <div key={child.id} className="card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
                <User size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{child.name}</p>
                <p className="text-xs text-ink-faint">
                  {child.className ?? 'Class not assigned'}
                  {child.admissionNumber && ` • ${child.admissionNumber}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-ink-muted justify-end">
                  <TrendingUp size={12} /> Average
                </div>
                <p className="text-sm font-semibold text-ink font-mono">
                  {child.average !== null && child.average !== undefined ? `${child.average}%` : 'Not yet published'}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-ink-muted justify-end">
                  <CalendarCheck size={12} /> Attendance
                </div>
                <p className="text-sm font-semibold text-ink font-mono">
                  {child.attendanceRate !== null && child.attendanceRate !== undefined ? `${child.attendanceRate}%` : '—'}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-surface-100 flex justify-end gap-2">
            <Link href={`/parent/fees/${child.id}`} className="btn-secondary btn-sm btn">
              Fees
            </Link>
            <Link href={`/parent/homework/${child.id}`} className="btn-secondary btn-sm btn">
              Homework
            </Link>
            <Link href={`/parent/history/${child.id}`} className="btn-secondary btn-sm btn">
              Academic History
            </Link>
            <Link href={`/parent/report/${child.id}`} className="btn-primary btn-sm btn">
              View Report Card
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}