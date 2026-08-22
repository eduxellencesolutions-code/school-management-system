// FILE: src/app/(dashboard)/cohorts/[groupId]/upload-students/page.tsx
'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface StudentRow {
  first_name: string; last_name: string; other_names?: string
  admission_number?: string; email?: string; phone?: string
  date_of_birth?: string; gender?: string; level?: string
}

// Minimal CSV parser — handles quoted fields with commas, standard
// Excel/Sheets export format. Swap for papaparse if you already use
// it elsewhere and want more robust edge-case handling.
function parseCsv(text: string): StudentRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const splitLine = (line: string) => {
    const cells: string[] = []
    let cur = ''; let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { cells.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    cells.push(cur.trim())
    return cells
  }
  const headers = splitLine(lines[0]).map(h => h.toLowerCase())
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cells = splitLine(line)
    const row: any = {}
    headers.forEach((h, i) => { row[h] = cells[i] ?? '' })
    return row as StudentRow
  })
}

export default function UploadStudentsPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const supabase = createClient()

  const [rows, setRows] = useState<StudentRow[]>([])
  const [duplicates, setDuplicates] = useState<Set<string>>(new Set())
  const [invalidCount, setInvalidCount] = useState(0)
  const [checked, setChecked] = useState(false)
  const [result, setResult] = useState<{ students_created: number; skipped_duplicates: number; failed: number; failed_details: any[] } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const parsed = parseCsv(text)
    setRows(parsed)
    setChecked(false)
    setResult(null)

    const invalid = parsed.filter(r => !r.first_name?.trim() || !r.last_name?.trim()).length
    setInvalidCount(invalid)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
    if (!profile?.organization_id) return

    const admissionNumbers = parsed.map(r => r.admission_number).filter((a): a is string => !!a?.trim())
    if (admissionNumbers.length > 0) {
      const { data: dupes } = await supabase.rpc('check_duplicate_admission_numbers', {
        p_org_id: profile.organization_id, p_admission_numbers: admissionNumbers,
      })
      setDuplicates(new Set((dupes ?? []).map((d: any) => d.admission_number)))
    }
    setChecked(true)
  }

  async function handleUpload() {
    setIsSubmitting(true)
    const { data, error } = await supabase.rpc('bulk_upload_students', { p_group_id: groupId, p_students: rows })
    if (error) {
      alert(error.message)
      setIsSubmitting(false)
      return
    }
    setResult(data?.[0] ?? null)
    setIsSubmitting(false)
  }

  const validCount = rows.length - invalidCount
  const dupCount = rows.filter(r => r.admission_number && duplicates.has(r.admission_number)).length

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/cohorts" className="text-sm text-ink-muted hover:text-ink">Cohorts</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">Bulk Upload Students</span>
      </div>
      <h1 className="page-title mb-1">Bulk Upload Students</h1>
      <p className="page-subtitle mb-6">
        CSV columns: first_name, last_name, other_names, admission_number, email, phone, date_of_birth, gender, level
      </p>

      <div className="card p-6 flex flex-col gap-4">
        <input type="file" accept=".csv" onChange={handleFile} className="input" />

        {checked && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="font-semibold text-green-700">{validCount - dupCount}</p>
              <p className="text-xs text-green-700">Ready to import</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="font-semibold text-amber-700">{dupCount}</p>
              <p className="text-xs text-amber-700">Duplicate matric — will be skipped</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="font-semibold text-red-700">{invalidCount}</p>
              <p className="text-xs text-red-700">Missing name — will fail</p>
            </div>
          </div>
        )}

        {checked && rows.length > 0 && (
          <button onClick={handleUpload} disabled={isSubmitting} className="btn-primary btn">
            {isSubmitting ? 'Uploading…' : `Import ${rows.length} row(s)`}
          </button>
        )}

        {result && (
          <div className="bg-surface-50 border border-surface-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-ink mb-1">Import complete</p>
            <p className="text-ink-muted">{result.students_created} created · {result.skipped_duplicates} duplicates skipped · {result.failed} failed</p>
            {result.failed_details?.length > 0 && (
              <ul className="mt-2 text-xs text-red-600 list-disc list-inside">
                {result.failed_details.map((f: any, i: number) => <li key={i}>{f.error} — {JSON.stringify(f.row)}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}