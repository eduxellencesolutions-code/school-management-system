'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, Award } from 'lucide-react'

interface Subject {
  subject_id: string
  subject_name: string
  grade: string
  remark: string
  total: number
  percentage: number
  component_scores: Array<{ name: string; score: number; max_score: number; percentage: number }>
}

interface ReportData {
  average: number
  position: number
  grade: string
  remark: string
  publishedAt: string
  subjects: Subject[]
}

interface LearnerInfo {
  name: string
  admissionNumber: string | null
  className: string | null
}

export default function ReportCard({ learnerId }: { learnerId: string }) {
  const [learner, setLearner] = useState<LearnerInfo | null>(null)
  const [report, setReport] = useState<ReportData | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/parents/report?learnerId=${learnerId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setLearner(data.learner)
          setReport(data.report)
          setMessage(data.message ?? null)
        }
      })
      .catch(() => setError('Could not load this report.'))
      .finally(() => setLoading(false))
  }, [learnerId])

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading report...
      </div>
    )
  }

  if (error) {
    return <div className="card p-6 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/parent/dashboard" className="text-sm text-brand-500 hover:underline flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      {learner && (
        <div className="card p-5">
          <h1 className="text-lg font-bold text-ink">{learner.name}</h1>
          <p className="text-sm text-ink-muted">
            {learner.className ?? 'Class not assigned'}
            {learner.admissionNumber && ` • ${learner.admissionNumber}`}
          </p>
        </div>
      )}

      {!report && (
        <div className="card p-8 text-center text-sm text-ink-muted">
          {message ?? 'No result available yet.'}
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <p className="text-xs text-ink-muted mb-1">Average</p>
              <p className="text-2xl font-bold text-ink font-mono">{report.average}%</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-ink-muted mb-1">Position</p>
              <p className="text-2xl font-bold text-ink font-mono">{report.position ?? '—'}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-ink-muted mb-1">Overall Grade</p>
              <div className="flex items-center justify-center gap-1">
                <Award size={18} className="text-brand-500" />
                <p className="text-2xl font-bold text-ink">{report.grade}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-sm text-ink">Subject Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Subject</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Score</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Grade</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {report.subjects.map((s) => (
                    <tr key={s.subject_id} className="border-b border-surface-100">
                      <td className="px-4 py-2 font-medium text-ink">{s.subject_name}</td>
                      <td className="px-4 py-2 text-right font-mono">{s.total}%</td>
                      <td className="px-4 py-2 text-center">
                        <span className="badge badge-blue text-[10px]">{s.grade}</span>
                      </td>
                      <td className="px-4 py-2 text-ink-muted text-xs">{s.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-ink-faint text-center">
            Published {new Date(report.publishedAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </>
      )}
    </div>
  )
}
