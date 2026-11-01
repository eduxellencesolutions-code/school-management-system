import Papa from 'papaparse'

export const CANONICAL_FIELDS = [
  'first_name', 'last_name', 'other_names', 'admission_number', 'gender', 'date_of_birth', 'email', 'phone',
  'faculty', 'department', 'programme', 'level', 'entry_session', 'campus',
] as const
export type CanonicalField = (typeof CANONICAL_FIELDS)[number]
export type ImportRow = { _row: number } & Partial<Record<CanonicalField, string>>

export const REQUIRED_FIELDS: CanonicalField[] = [
  'first_name', 'last_name', 'admission_number', 'faculty', 'department', 'programme', 'entry_session',
]

// English and French header aliases (accents, case, spaces and punctuation are ignored)
const ALIASES: Record<CanonicalField, string[]> = {
  first_name: ['first_name', 'firstname', 'given_name', 'prenom', 'prenoms'],
  last_name: ['last_name', 'lastname', 'surname', 'family_name', 'nom', 'nom_de_famille'],
  other_names: ['other_names', 'middle_name', 'autres_noms', 'autres_prenoms'],
  admission_number: ['admission_number', 'student_id', 'matricule', 'numero_matricule', 'n_matricule', 'numero_etudiant'],
  gender: ['gender', 'sex', 'sexe', 'genre'],
  date_of_birth: ['date_of_birth', 'dob', 'birth_date', 'date_de_naissance', 'date_naissance', 'naissance'],
  email: ['email', 'e_mail', 'mail', 'courriel', 'adresse_email'],
  phone: ['phone', 'mobile', 'telephone', 'tel', 'numero_de_telephone'],
  faculty: ['faculty', 'faculte', 'ufr'],
  department: ['department', 'departement', 'dept'],
  programme: ['programme', 'program', 'filiere', 'parcours'],
  level: ['level', 'niveau', 'annee_etude'],
  entry_session: ['entry_session', 'session', 'annee_universitaire', 'annee_academique', 'promotion'],
  campus: ['campus', 'campus_code', 'code_campus', 'site'],
}

// Adjust the values to your gender_type enum labels if they differ
const GENDER: Record<string, string> = {
  m: 'M', h: 'M', male: 'M', homme: 'M', masculin: 'M',
  f: 'F', female: 'F', femme: 'F', feminin: 'F',
  other: 'Other', autre: 'Other', o: 'Other',
}

function normalizeHeader(h: string): string {
  return h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

const HEADER_TO_FIELD: Record<string, CanonicalField> = {}
for (const f of CANONICAL_FIELDS) for (const a of ALIASES[f]) HEADER_TO_FIELD[a] = f

function isoDate(y: number, m: number, d: number): string | null {
  const t = new Date(Date.UTC(y, m - 1, d))
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null
  return t.toISOString().slice(0, 10)
}

// Day-first only for D/M/Y; anything unreadable is passed through so the server can report it
export function toIsoDate(v: unknown): string {
  if (v instanceof Date) return new Date(v.getTime() + 12 * 3600e3).toISOString().slice(0, 10)
  const s = String(v ?? '').trim()
  if (!s) return ''
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return isoDate(+m[1], +m[2], +m[3]) ?? s
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) return isoDate(+m[3], +m[2], +m[1]) ?? s
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    return new Date(Math.round((Number(s) - 25569) * 86400000)).toISOString().slice(0, 10)
  }
  return s
}

async function decodeText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf) }
  catch { return new TextDecoder('windows-1252').decode(buf) }   // typical for French Excel CSV exports
}

export async function parseImportFile(file: File): Promise<{ rows: ImportRow[]; problems: string[] }> {
  const name = file.name.toLowerCase()
  let records: Record<string, unknown>[] = []

  if (name.endsWith('.csv')) {
    const text = await decodeText(file)
    const res = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: 'greedy' })
    records = res.data
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array', cellDates: true })
    records = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true })
  } else {
    return { rows: [], problems: ['Upload a .csv, .xlsx or .xls file'] }
  }

  if (records.length === 0) return { rows: [], problems: ['The file has no data rows'] }
  if (records.length > 100000) return { rows: [], problems: ['Maximum 100,000 rows per file; split the file'] }

  const headerMap: Record<string, CanonicalField> = {}
  for (const h of Object.keys(records[0])) {
    const field = HEADER_TO_FIELD[normalizeHeader(h)]
    if (field) headerMap[h] = field
  }
  const present = new Set(Object.values(headerMap))
  const problems = REQUIRED_FIELDS.filter(f => !present.has(f))
    .map(f => `Missing column "${f}" (accepted headers: ${ALIASES[f].join(', ')})`)

  const rows: ImportRow[] = records.map((rec, i) => {
    const row: ImportRow = { _row: i + 2 }   // +2: header is row 1
    for (const [h, field] of Object.entries(headerMap)) {
      const raw = rec[h]
      let val = field === 'date_of_birth' ? toIsoDate(raw) : String(raw ?? '').trim()
      if (field === 'gender' && val) val = GENDER[normalizeHeader(val)] ?? val
      if (val) row[field] = val
    }
    return row
  })
  return { rows, problems }
}

export function buildTemplateCsv(): string {
  return Papa.unparse({ fields: [...CANONICAL_FIELDS], data: [] }) + '\n'
}

export function errorsToCsv(errors: { file_row: number; result: string; codes: string; message: string; raw: Record<string, string> }[]): string {
  return Papa.unparse(errors.map(e => ({
    file_row: e.file_row, result: e.result, error_codes: e.codes, message: e.message,
    ...Object.fromEntries(CANONICAL_FIELDS.map(f => [f, e.raw?.[f] ?? ''])),
  })))
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' })   // BOM keeps accents intact in Excel
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}