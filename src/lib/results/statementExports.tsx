// FILE: src/lib/results/statementExports.tsx
import { saveAs } from 'file-saver'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ResultsBundle } from './bundleTypes'

export type ExportKind = 'statement_pdf' | 'statement_xlsx' | 'share_card'

// Every export is recorded first. If recording fails, nothing is produced.
export async function recordExport(
  supabase: SupabaseClient,
  learnerId: string,
  kind: ExportKind,
  details: Record<string, unknown> = {},
): Promise<string> {
  const { data, error } = await supabase.rpc('record_tertiary_export', { p_learner_id: learnerId, p_kind: kind, p_details: details })
  if (error || !data) throw new Error(error?.message ?? 'The export could not be recorded')
  return String(data)
}

export function referenceCode(exportId: string): string {
  return 'SR-' + exportId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

function fileStem(b: ResultsBundle): string {
  const raw = b.profile.admission_number || `${b.profile.last_name}_${b.profile.first_name}`
  return raw.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'student'
}

export async function downloadStatementPdf(bundle: ResultsBundle, exportId: string): Promise<void> {
  const [{ pdf }, { StatementDocument }] = await Promise.all([import('@react-pdf/renderer'), import('./statementPdf')])
  const blob = await pdf(
    <StatementDocument bundle={bundle} reference={referenceCode(exportId)} generatedAt={new Date().toISOString()} />,
  ).toBlob()
  saveAs(blob, `${fileStem(bundle)}_Statement_of_Results_UNOFFICIAL.pdf`)
}

export async function downloadStatementXlsx(bundle: ResultsBundle, exportId: string): Promise<void> {
  const XLSX = await import('xlsx')
  const p = bundle.profile
  const t = bundle.totals
  const ref = referenceCode(exportId)

  const summary: (string | number | null)[][] = [
    ['STATEMENT OF RESULTS - UNOFFICIAL'],
    ['A personal copy generated from published results. It is not an official transcript.'],
    ['Reference', ref],
    ['Generated', new Date().toISOString()],
    [],
    ['Institution', bundle.institution.name],
    ['Student', `${p.last_name} ${p.first_name}`],
    ['Matriculation number', p.admission_number],
    ['Programme', p.programme_name],
    ['Department', p.department_name],
    ['Faculty', p.faculty_name],
    ['Level', p.current_level],
    [],
    ['Cumulative GPA', t.cgpa],
    ['Grading scale maximum', t.cgpa_scale_max],
    ['Credits attempted', t.credits_attempted],
    ['Credits earned', t.credits_earned],
    ['Credits required', t.credits_required],
    ['Credits remaining', t.credits_remaining],
    ['Semesters with published results', t.semesters_with_results],
    ['Semesters completed', t.semesters_completed],
    [],
    [bundle.rules.gpa_rule],
    [bundle.rules.earned_rule],
  ]

  const published = bundle.semesters.filter(x => x.published_courses > 0)
  const semesterRows: (string | number | null)[][] = [
    ['Session', 'Semester', 'Semester GPA', 'Cumulative GPA', 'Credits attempted', 'Credits earned', 'Quality points', 'Status'],
    ...published.map(x => [x.session_name, x.term_name, x.gpa, x.cgpa_to_date, x.credits_attempted, x.credits_earned, x.quality_points, x.state]),
  ]
  const courseRows: (string | number | null)[][] = [
    ['Session', 'Semester', 'Code', 'Course title', 'Credit units', 'Score', 'Grade', 'Grade point', 'Quality points', 'Outcome', 'Attempt', 'Credits earned'],
    ...published.flatMap(x =>
      x.courses.map(c => [x.session_name, x.term_name, c.code, c.name, c.credit_unit, c.total_score, c.grade_letter, c.grade_point, c.quality_points,
        c.outcome ?? 'not configured', c.attempt_number, c.credits_earned])),
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(semesterRows), 'Semesters')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(courseRows), 'Courses')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${fileStem(bundle)}_Statement_of_Results_UNOFFICIAL.xlsx`,
  )
}