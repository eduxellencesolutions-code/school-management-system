'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { generateLearnerCSVTemplate, cn } from '@/lib/utils'
import { Upload, Download, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface CSVRow {
  first_name: string
  last_name: string
  other_names?: string
  admission_number?: string
  gender?: string
  date_of_birth?: string
  guardian_name?: string
  guardian_phone?: string
  email?: string
}

interface ParsedRow extends CSVRow {
  _row: number
  _errors: string[]
  _status: 'valid' | 'error' | 'duplicate'
}

interface Group { id: string; name: string }

export default function ImportStudentsPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  useState(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
      const { data: grps } = await supabase
        .from('groups').select('id, name')
        .eq('organization_id', profile?.organization_id ?? '')
        .eq('is_active', true).order('name')
      setGroups(grps ?? [])
    }
    load()
  })

  function downloadTemplate() {
    const csv = generateLearnerCSVTemplate()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'students_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function validateRow(row: CSVRow, index: number): ParsedRow {
    const errors: string[] = []
    if (!row.first_name?.trim()) errors.push('first_name required')
    if (!row.last_name?.trim()) errors.push('last_name required')
    if (row.gender && !['M', 'F', 'Other', 'male', 'female', 'm', 'f'].includes(row.gender.toLowerCase())) {
      errors.push('gender must be M, F, or Other')
    }
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push('invalid email')
    }
    const normalizedGender = row.gender
      ? (['m', 'male'].includes(row.gender.toLowerCase()) ? 'M'
        : ['f', 'female'].includes(row.gender.toLowerCase()) ? 'F' : 'Other')
      : undefined

    return {
      ...row,
      gender: normalizedGender,
      _row: index + 2,
      _errors: errors,
      _status: errors.length > 0 ? 'error' : 'valid',
    }
  }

  function processRows(rows: CSVRow[]) {
    if (rows.length === 0) { toast.error('File is empty'); return }
    if (rows.length > 500) { toast.error('Maximum 500 students per import'); return }

    const admNums = rows.map(r => r.admission_number).filter(Boolean)
    const dupSet = new Set(admNums.filter((v, i, a) => a.indexOf(v) !== i))

    const validated = rows.map((row, i) => {
      const v = validateRow(row, i)
      if (row.admission_number && dupSet.has(row.admission_number)) {
        v._status = 'duplicate'
        v._errors.push('duplicate admission number in file')
      }
      return v
    })

    setParsed(validated)
    toast.success(`${validated.length} rows parsed`)
  }

  function handleFile(file: File) {
    const name = file.name.toLowerCase()

    // ── Excel ──────────────────────────────────────────────
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json<CSVRow>(ws, { defval: '' })
          processRows(rows)
        } catch {
          toast.error('Failed to parse Excel file')
        }
      }
      reader.readAsArrayBuffer(file)
      return
    }

    // ── CSV ────────────────────────────────────────────────
    if (name.endsWith('.csv')) {
      Papa.parse<CSVRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processRows(results.data),
        error: () => toast.error('Failed to parse CSV file'),
      })
      return
    }

    toast.error('Please upload a .csv, .xlsx, or .xls file')
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function runImport() {
    if (!selectedGroup) { toast.error('Select a class first'); return }
    const validRows = parsed.filter(r => r._status === 'valid')
    if (validRows.length === 0) { toast.error('No valid rows to import'); return }

    setImporting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

    let success = 0
    let failed = 0

    const batches = []
    for (let i = 0; i < validRows.length; i += 50) batches.push(validRows.slice(i, i + 50))

    for (const batch of batches) {
      const inserts = batch.map(r => ({
        organization_id:  profile?.organization_id,
        group_id:         selectedGroup,
        first_name:       r.first_name.trim(),
        last_name:        r.last_name.trim(),
        other_names:      r.other_names?.trim() || null,
        admission_number: r.admission_number?.trim() || null,
        gender:           r.gender || null,
        date_of_birth:    r.date_of_birth || null,
        guardian_name:    r.guardian_name?.trim() || null,
        guardian_phone:   r.guardian_phone?.trim() || null,
        email:            r.email?.trim() || null,
        enrollment_date:  new Date().toISOString().split('T')[0],
        is_active:        true,
      }))

      const { error, data } = await supabase
        .from('learners')
        .upsert(inserts, { onConflict: 'organization_id,admission_number', ignoreDuplicates: true })
        .select()

      if (error) { failed += batch.length } else { success += data?.length ?? batch.length }
    }

    setImportResults({ success, failed })
    setImporting(false)
    if (success > 0) toast.success(`${success} student${success !== 1 ? 's' : ''} imported!`)
    if (failed > 0) toast.error(`${failed} row${failed !== 1 ? 's' : ''} failed`)
  }

  const validCount = parsed.filter(r => r._status === 'valid').length
  const errorCount = parsed.filter(r => r._status === 'error').length
  const dupCount   = parsed.filter(r => r._status === 'duplicate').length

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/students" className="text-ink-muted hover:text-ink">Students</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">Import</span>
      </div>

      <div>
        <h1 className="page-title mb-1">Import students</h1>
        <p className="page-subtitle">Upload a CSV or Excel file to enrol multiple students at once.</p>
      </div>

      {/* Step 1 */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <h2 className="font-semibold text-sm text-ink">Download the template</h2>
            </div>
            <p className="text-xs text-ink-muted ml-7">
              Required columns: <code>first_name</code>, <code>last_name</code>. Optional: <code>other_names</code>, <code>admission_number</code>, <code>gender</code>, <code>date_of_birth</code>, <code>guardian_name</code>, <code>guardian_phone</code>, <code>email</code>.
            </p>
          </div>
          <button onClick={downloadTemplate} className="btn-secondary btn-sm btn shrink-0">
            <Download size={13} /> Download template
          </button>
        </div>
      </div>

      {/* Step 2 */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
          <h2 className="font-semibold text-sm text-ink">Select destination class</h2>
        </div>
        <select className="input max-w-xs ml-7" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
          <option value="">Select class…</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* Step 3 */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
          <h2 className="font-semibold text-sm text-ink">Upload your file</h2>
        </div>

        <div
          className={cn(
            'ml-7 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            dragOver ? 'border-brand-400 bg-brand-50' : 'border-surface-200 hover:border-brand-300 hover:bg-surface-50'
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <Upload size={24} className="mx-auto mb-2 text-ink-faint" />
          <p className="text-sm font-medium text-ink mb-1">Drop your file here or click to browse</p>
          <p className="text-xs text-ink-muted">Accepts <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong> — max 500 students</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>

      {/* Preview */}
      {parsed.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-sm text-ink">Preview — {parsed.length} rows</h2>
              <span className="badge badge-green">{validCount} valid</span>
              {errorCount > 0 && <span className="badge badge-red">{errorCount} errors</span>}
              {dupCount > 0 && <span className="badge badge-amber">{dupCount} duplicates</span>}
            </div>
            <button
              onClick={runImport}
              disabled={importing || validCount === 0 || !selectedGroup}
              className="btn-primary btn-sm btn"
            >
              {importing
                ? <><Loader2 size={12} className="animate-spin" /> Importing…</>
                : <><Upload size={12} /> Import {validCount} student{validCount !== 1 ? 's' : ''}</>
              }
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Row</th><th>Status</th><th>Last Name</th><th>First Name</th>
                  <th>Adm. No</th><th>Gender</th><th>Guardian Phone</th><th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 100).map((row) => (
                  <tr key={row._row} className={cn(
                    row._status === 'error'     && 'bg-red-50',
                    row._status === 'duplicate' && 'bg-amber-50',
                  )}>
                    <td className="text-xs text-ink-muted font-mono">{row._row}</td>
                    <td>
                      {row._status === 'valid'
                        ? <CheckCircle2 size={14} className="text-green-500" />
                        : row._status === 'duplicate'
                        ? <AlertCircle size={14} className="text-amber-500" />
                        : <XCircle size={14} className="text-red-500" />
                      }
                    </td>
                    <td className="font-medium">{row.last_name}</td>
                    <td>{row.first_name}</td>
                    <td className="font-mono text-xs">{row.admission_number ?? '—'}</td>
                    <td>{row.gender ?? '—'}</td>
                    <td>{row.guardian_phone ?? '—'}</td>
                    <td className="text-xs text-red-600">{row._errors.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 100 && (
              <div className="px-4 py-2 text-xs text-ink-muted bg-surface-50 border-t border-surface-200">
                Showing first 100 of {parsed.length} rows. All valid rows will be imported.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {importResults && (
        <div className={cn(
          'card p-5 flex items-center gap-4',
          importResults.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
        )}>
          <CheckCircle2 size={24} className="text-green-500 shrink-0" />
          <div>
            <p className="font-semibold text-ink">{importResults.success} students imported successfully</p>
            {importResults.failed > 0 && (
              <p className="text-sm text-amber-700">{importResults.failed} rows failed (likely duplicate admission numbers)</p>
            )}
          </div>
          <Link href={`/students?class=${selectedGroup}`} className="btn-primary btn-sm btn ml-auto">
            View students →
          </Link>
        </div>
      )}
    </div>
  )
}
