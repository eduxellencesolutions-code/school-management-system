'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import { Upload, Download, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { parseImportFile, buildTemplateCsv, errorsToCsv, downloadText, type ImportRow } from '@/lib/import/universityImport'

const CHUNK = 250
type Phase = 'idle' | 'parsed' | 'staging' | 'staged' | 'importing' | 'done'

export default function UniversityImportPage() {
  const t = useTranslations('import')
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [filename, setFilename] = useState('')
  const [problems, setProblems] = useState<string[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [batchId, setBatchId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [summary, setSummary] = useState<any>(null)
  const [sample, setSample] = useState<{ file_row: number; message: string }[]>([])

  async function onFile(file: File) {
    const res = await parseImportFile(file)
    setFilename(file.name); setRows(res.rows); setProblems(res.problems); setSummary(null); setSample([])
    setPhase(res.problems.length === 0 && res.rows.length > 0 ? 'parsed' : 'idle')
  }

  async function refresh(id: string) {
    const { data } = await supabase.rpc('get_admission_import_summary', { p_batch_id: id })
    setSummary(data)
  }

  async function stage() {
    setPhase('staging'); setProgress(0); setSample([])
    const { data: batch, error } = await supabase
      .rpc('create_admission_import_batch', { p_strict: true, p_filename: filename }).single()
    if (error || !batch) { toast.error(error?.message ?? t('errorCodes.import_failed')); setPhase('parsed'); return }
    const id = (batch as any).id as string
    setBatchId(id)
    const collected: { file_row: number; message: string }[] = []
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { data, error: e } = await supabase.rpc('stage_admission_import_rows', { p_batch_id: id, p_rows: rows.slice(i, i + CHUNK) })
      if (e) { toast.error(`Rows ${i + 1}-${Math.min(i + CHUNK, rows.length)}: ${e.message}`); setPhase('parsed'); return }
      if (collected.length < 20) collected.push(...((data as any).sample_errors ?? []))
      setProgress(Math.min(100, Math.round(((i + CHUNK) / rows.length) * 100)))
    }
    setSample(collected.slice(0, 20))
    await refresh(id)
    setPhase('staged')
  }

  async function downloadErrors() {
    if (!batchId) return
    const all: any[] = []
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.rpc('get_admission_import_errors', { p_batch_id: batchId, p_limit: 1000, p_offset: offset })
      if (error) { toast.error(error.message); return }
      all.push(...(data as any[]))
      if ((data as any[]).length < 1000) break
    }
    downloadText(`import_errors_${filename.replace(/\.[^.]+$/, '')}.csv`, errorsToCsv(all))
  }

  async function runImport() {
    if (!batchId) return
    setPhase('importing')
    for (;;) {
      const { data, error } = await supabase.rpc('execute_admission_import', { p_batch_id: batchId, p_limit: CHUNK })
      if (error) { toast.error(error.message); break }
      const r = data as { imported: number; failed: number; remaining_ready: number }
      await refresh(batchId)
      if (r.remaining_ready === 0) break
      if (r.imported + r.failed === 0) { toast.error('Import stalled; check the error log'); break }
    }
    setPhase('done')
  }

  const counts = summary?.counts ?? {}
  const ready = counts.ready ?? 0
  const bad = (counts.invalid ?? 0) + (counts.duplicate ?? 0)

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/students" className="text-ink-muted hover:text-ink">Students</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">{t('title')}</span>
      </div>
      <div>
        <h1 className="page-title mb-1">{t('title')}</h1>
        <p className="page-subtitle">{t('subtitle')}</p>
      </div>

      <div className="card p-5 flex items-center justify-between gap-4">
        <p className="text-sm text-ink-muted">French or English column headers are accepted (matricule, nom, prénom, filière, campus...).</p>
        <button className="btn btn-secondary btn-sm" onClick={() => downloadText('university_import_template.csv', buildTemplateCsv())}>
          <Download size={13} /> {t('template')}
        </button>
      </div>

      <div className="card p-5">
        <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer" onClick={() => fileRef.current?.click()}>
          <Upload size={24} className="mx-auto mb-2 text-ink-faint" />
          <p className="text-sm font-medium text-ink">{filename || t('chooseFile')}</p>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                 onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>
        {problems.length > 0 && <ul className="mt-3 text-sm text-red-600 list-disc ml-5">{problems.map(p => <li key={p}>{p}</li>)}</ul>}
        {rows.length > 0 && problems.length === 0 && <p className="mt-3 text-sm text-ink">{t('rowsRead', { count: rows.length })}</p>}
      </div>

      {phase === 'parsed' && (
        <button className="btn btn-primary w-fit" onClick={stage}><Upload size={14} /> {t('validate', { count: rows.length })}</button>
      )}
      {phase === 'staging' && <div className="card p-4 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> {t('validating', { percent: progress })}</div>}

      {summary && (
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="badge badge-green">{t('ready', { count: ready })}</span>
            <span className="badge badge-red">{t('errors', { count: counts.invalid ?? 0 })}</span>
            <span className="badge badge-amber">{t('duplicates', { count: counts.duplicate ?? 0 })}</span>
            <span className="badge">{t('imported', { count: counts.imported ?? 0 })}</span>
          </div>
          {Object.keys(summary.error_codes ?? {}).length > 0 && (
            <p className="text-xs text-ink-muted">
              {Object.entries(summary.error_codes).map(([c, n]) => `${t('errorCodes.' + c)}: ${n}`).join(' | ')}
            </p>
          )}
          {sample.length > 0 && (
            <ul className="text-xs text-red-600 list-disc ml-5">
              {sample.map(s => <li key={s.file_row}>Row {s.file_row}: {s.message}</li>)}
            </ul>
          )}
          <div className="flex gap-2">
            {bad > 0 && <button className="btn btn-secondary btn-sm" onClick={downloadErrors}><Download size={13} /> {t('downloadErrors')}</button>}
            {(phase === 'staged') && ready > 0 && (
              <button className="btn btn-primary btn-sm" onClick={runImport}>{t('importValid', { count: ready })}</button>
            )}
            {phase === 'importing' && <span className="text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> {t('importing')}</span>}
            {phase === 'done' && <span className="text-sm flex items-center gap-2 text-green-600"><CheckCircle2 size={14} /> {t('finished')}</span>}
          </div>
        </div>
      )}
    </div>
  )
}