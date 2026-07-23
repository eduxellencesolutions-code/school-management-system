'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft } from 'lucide-react'

interface ComponentScore {
  name: string
  score: number
  max_score: number
}

interface Subject {
  subject_id: string
  subject_name: string
  grade: string
  remark: string
  total: number
  max_score: number
  percentage: number
  component_scores: ComponentScore[]
}

interface ReportData {
  average: number
  grandTotal: number
  position: number
  classSize: number
  classAverageTotal: number | null
  grade: string
  remark: string
  publishedAt: string
  subjects: Subject[]
}

const GOLD = '#C8960C'
const GOLD_LIGHT = '#F5E6B8'
const CREAM = '#FDFAF4'
const DARK = '#0D0D0D'
const MUTED = '#6B6456'
const BORDER = '#E2D9C8'

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#166534'
    case 'B': return '#1E40AF'
    case 'C': return '#92400E'
    case 'D': return '#9A3412'
    case 'E': return '#78350F'
    default: return '#991B1B'
  }
}

export default function ReportCard({ learnerId }: { learnerId: string }) {
  const [data, setData] = useState<any>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/parents/report?learnerId=${learnerId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error)
        } else {
          setData(d)
          setMessage(d.message ?? null)
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

  const { school, learner, term, report, remarks, signatories } = data ?? {}

  // Build the union of component names (CA 1, CA 2, Exam, etc.) across all subjects
  const compNames: string[] = []
  if (report?.subjects) {
    report.subjects.forEach((s: Subject) => {
      s.component_scores?.forEach((c) => {
        if (!compNames.includes(c.name)) compNames.push(c.name)
      })
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/parent/dashboard" className="text-sm text-brand-500 hover:underline flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      {!report && (
        <div className="card p-8 text-center text-sm text-ink-muted">
          {message ?? 'No result available yet.'}
        </div>
      )}

      {report && (
        <div
          className="bg-white rounded-lg shadow-sm overflow-hidden"
          style={{ border: `1px solid ${BORDER}` }}
        >
          {/* School header */}
          <div
            className="flex flex-col items-center px-6 pt-6 pb-4"
            style={{ borderBottom: `2px solid ${GOLD}` }}
          >
            {school?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={school.logoUrl} alt={school.name} className="w-14 h-14 object-contain mb-2" />
            )}
            <h1 className="text-lg font-bold text-center" style={{ color: DARK }}>
              {school?.name}
            </h1>
            {school?.motto && (
              <p className="text-xs italic text-center mt-0.5" style={{ color: MUTED }}>
                &ldquo;{school.motto}&rdquo;
              </p>
            )}
            {school?.address && (
              <p className="text-[11px] text-center mt-0.5" style={{ color: MUTED }}>
                {school.address}
              </p>
            )}
          </div>

          <div className="px-6 py-4">
            {/* Report title band */}
            <div
              className="text-center text-sm font-bold py-1.5 rounded mb-4"
              style={{ backgroundColor: GOLD_LIGHT, color: DARK }}
            >
              ACADEMIC REPORT SHEET
            </div>

            {/* Info box */}
            <div
              className="grid grid-cols-2 gap-x-4 gap-y-2 rounded p-3 mb-4"
              style={{ backgroundColor: CREAM, border: `1px solid ${BORDER}` }}
            >
              <div>
                <p className="text-[10px] font-semibold" style={{ color: MUTED }}>Name</p>
                <p className="text-sm font-bold" style={{ color: DARK }}>{learner?.name}</p>
              </div>
              {learner?.admissionNumber && (
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: MUTED }}>Admission No.</p>
                  <p className="text-sm" style={{ color: DARK }}>{learner.admissionNumber}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold" style={{ color: MUTED }}>Class</p>
                <p className="text-sm" style={{ color: DARK }}>{learner?.className}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold" style={{ color: MUTED }}>Term / Session</p>
                <p className="text-sm" style={{ color: DARK }}>{term?.name} · {term?.sessionName}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold" style={{ color: MUTED }}>Position</p>
                <p className="text-sm font-bold" style={{ color: GOLD }}>
                  {report.position}{report.classSize ? ` of ${report.classSize}` : ''}
                </p>
              </div>
            </div>

            {/* Subject table */}
            <div className="mb-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: GOLD }}>
                    <th className="text-left px-2 py-1.5 text-white font-bold">Subject</th>
                    {compNames.map((name) => (
                      <th key={name} className="text-center px-2 py-1.5 text-white font-bold">{name}</th>
                    ))}
                    <th className="text-center px-2 py-1.5 text-white font-bold">Total</th>
                    <th className="text-center px-2 py-1.5 text-white font-bold">%</th>
                    <th className="text-center px-2 py-1.5 text-white font-bold">Grd</th>
                  </tr>
                </thead>
                <tbody>
                  {report.subjects.map((s: Subject, idx: number) => (
                    <tr
                      key={s.subject_id}
                      style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : CREAM, borderBottom: `1px solid #EEE8DC` }}
                    >
                      <td className="px-2 py-1.5 font-bold" style={{ color: DARK }}>{s.subject_name}</td>
                      {compNames.map((name) => {
                        const comp = s.component_scores?.find((c) => c.name === name)
                        return (
                          <td key={name} className="text-center px-2 py-1.5" style={{ color: DARK }}>
                            {comp && comp.score !== null && comp.score !== undefined ? comp.score : '—'}
                          </td>
                        )
                      })}
                      <td className="text-center px-2 py-1.5 font-bold" style={{ color: DARK }}>{s.total}</td>
                      <td className="text-center px-2 py-1.5" style={{ color: DARK }}>{s.percentage.toFixed(0)}%</td>
                      <td className="text-center px-2 py-1.5 font-bold" style={{ color: gradeColor(s.grade) }}>{s.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary strip */}
            <div
              className="grid grid-cols-4 gap-2 rounded p-3 mb-4 text-center"
              style={{ backgroundColor: GOLD_LIGHT }}
            >
              <div>
                <p className="text-xl font-bold" style={{ color: DARK }}>{report.grandTotal}</p>
                <p className="text-[10px]" style={{ color: MUTED }}>Grand Total</p>
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: DARK }}>{report.average.toFixed(1)}</p>
                <p className="text-[10px]" style={{ color: MUTED }}>Average</p>
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: gradeColor(report.grade) }}>{report.grade}</p>
                <p className="text-[10px]" style={{ color: MUTED }}>Grade</p>
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: DARK }}>{report.position}</p>
                <p className="text-[10px]" style={{ color: MUTED }}>Position</p>
              </div>
            </div>

            {/* Class stats */}
            {report.classAverageTotal !== null && (
              <div
                className="grid grid-cols-2 gap-2 rounded p-3 mb-4 text-center"
                style={{ backgroundColor: CREAM, border: `1px solid ${BORDER}` }}
              >
                <div>
                  <p className="text-base font-bold" style={{ color: DARK }}>{report.classSize}</p>
                  <p className="text-[10px]" style={{ color: MUTED }}>Class Size</p>
                </div>
                <div>
                  <p className="text-base font-bold" style={{ color: DARK }}>{report.classAverageTotal.toFixed(1)}</p>
                  <p className="text-[10px]" style={{ color: MUTED }}>Class Avg. Total</p>
                </div>
              </div>
            )}

            {/* Remarks */}
            {remarks?.teacher && (
              <div className="rounded p-3 mb-3" style={{ border: `1px solid ${GOLD}` }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>CLASS TEACHER&apos;S REMARK</p>
                <p className="text-sm leading-relaxed" style={{ color: DARK }}>{remarks.teacher}</p>
              </div>
            )}

            {remarks?.principal && (
              <div className="rounded p-3 mb-4" style={{ border: `1px solid ${GOLD}` }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>
                  {(signatories?.principalTitle ?? 'PRINCIPAL').toUpperCase()}&apos;S REMARK
                </p>
                <p className="text-sm leading-relaxed" style={{ color: DARK }}>{remarks.principal}</p>
              </div>
            )}

            {/* Signatures */}
            <div className="flex justify-between pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
              <div className="flex flex-col items-center w-[45%]">
                <p className="text-[10px] mb-1" style={{ color: MUTED }}>Class Teacher&apos;s Signature</p>
                {signatories?.teacherSignatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signatories.teacherSignatureUrl} alt="Signature" className="h-8 object-contain mb-1" />
                ) : (
                  <div className="h-8 w-24 border border-dashed flex items-center justify-center mb-1" style={{ borderColor: BORDER }}>
                    <span className="text-[9px] italic" style={{ color: MUTED }}>Not yet signed</span>
                  </div>
                )}
                <div className="w-24 border-b" style={{ borderColor: DARK }} />
                <p className="text-[11px] mt-1" style={{ color: DARK }}>{signatories?.teacherName ?? '—'}</p>
                <p className="text-[9px] italic" style={{ color: MUTED }}>Class Teacher</p>
              </div>

              <div className="flex flex-col items-center w-[45%]">
                <p className="text-[10px] mb-1" style={{ color: MUTED }}>{signatories?.principalTitle ?? 'Head Teacher'}&apos;s Signature</p>
                {signatories?.principalSignatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signatories.principalSignatureUrl} alt="Signature" className="h-8 object-contain mb-1" />
                ) : (
                  <div className="h-8 w-24 border border-dashed flex items-center justify-center mb-1" style={{ borderColor: BORDER }}>
                    <span className="text-[9px] italic" style={{ color: MUTED }}>Not yet signed</span>
                  </div>
                )}
                <div className="w-24 border-b" style={{ borderColor: DARK }} />
                <p className="text-[11px] mt-1" style={{ color: DARK }}>{signatories?.principalName ?? '—'}</p>
                <p className="text-[9px] italic" style={{ color: MUTED }}>{signatories?.principalTitle ?? 'Head Teacher'}</p>
              </div>
            </div>

            <p className="text-[9px] text-center mt-4" style={{ color: MUTED }}>
              Report ID: {data.reportId} · Generated{' '}
              {new Date(report.publishedAt).toLocaleDateString('en-NG')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}