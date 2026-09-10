// FILE: src/app/student/results/page.tsx  (full replacement — adds the download button, same trigger pattern as ReportDownloadButtons.tsx)
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import { FileDown, Loader2 } from 'lucide-react'
import { TertiaryTranscript } from '@/components/tertiary/TertiaryTranscript'

export default function StudentResultsPage() {
  const supabase = createClient()
  const [record, setRecord] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.rpc('get_my_tertiary_academic_record')
      if (error) { setError(error.message); setLoading(false); return }
      setRecord(data)
      setLoading(false)
    }
    load()
  }, [])

  async function downloadTranscript() {
    if (!record) return
    setDownloading(true)
    try {
      const doc = (
        <TertiaryTranscript
          institution={record.institution}
          profile={record.profile}
          cgpa={record.cgpa}
          terms={record.terms}
        />
      )
      const blob = await pdf(doc).toBlob()
      saveAs(blob, `${record.profile.admission_number}_Transcript.pdf`)
    } catch (err) {
      console.error('Transcript generation error:', err)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return <p className="text-sm text-ink-faint">Loading…</p>
  if (error) return <div className="card p-6"><p className="text-sm text-red-600">{error}</p></div>
  if (!record) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="page-title">Results & Academic Record</h1>
        <button onClick={downloadTranscript} disabled={downloading} className="btn-primary btn-sm btn flex items-center gap-1.5 disabled:opacity-50">
          {downloading ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><FileDown size={13} /> Download Transcript</>}
        </button>
      </div>
      <p className="page-subtitle mb-6">{record.profile.admission_number} · {record.profile.faculty_name}</p>

      {record.terms.length === 0 ? (
        <p className="text-sm text-ink-faint">No published results yet.</p>
      ) : (
        record.terms.map((term: any) => (
          <div key={term.term_id} className="card p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-ink">{term.term_name} — {term.session_name}</p>
              <p className="text-sm text-ink-muted">GPA: {term.gpa_detail.gpa ?? '—'}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faint uppercase tracking-wider">
                  <th className="pb-2">Course</th><th className="pb-2">Units</th><th className="pb-2">Score</th><th className="pb-2">Grade</th>
                </tr>
              </thead>
              <tbody>
                {term.gpa_detail.courses.map((c: any) => (
                  <tr key={c.subject_id} className="border-t border-surface-100">
                    <td className="py-1.5">{c.code} — {c.name}</td>
                    <td className="py-1.5">{c.credit_unit}</td>
                    <td className="py-1.5">{c.total_score}</td>
                    <td className="py-1.5">{c.grade_letter} ({c.grade_point})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  )
}