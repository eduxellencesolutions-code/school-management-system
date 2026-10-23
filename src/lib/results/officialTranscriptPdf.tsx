// FILE: src/lib/results/officialTranscriptPdf.tsx
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { ResultsBundle } from './bundleTypes'

export interface OfficialIssue {
  id: string
  reference: string
  issued_at: string
  status: string
  snapshot_hash: string
  snapshot: { document: string; bundle: ResultsBundle; recipient?: string | null }
}

const blue = '#153a88'
const ink = '#0D1117'
const muted = '#5A6472'
const line = '#D8D4CC'
const soft = '#F3F5FA'

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 60, paddingHorizontal: 36, fontFamily: 'Helvetica', fontSize: 9, color: ink },
  watermark: { position: 'absolute', top: 330, left: 60, fontSize: 90, color: '#F4D9D9', transform: 'rotate(-30deg)', fontFamily: 'Helvetica-Bold' },
  header: { alignItems: 'center', borderBottomWidth: 2, borderBottomColor: blue, paddingBottom: 8, marginBottom: 10 },
  inst: { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  small: { fontSize: 8, color: muted, textAlign: 'center', marginTop: 2 },
  title: { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'center', backgroundColor: soft, paddingVertical: 5, marginBottom: 10 },
  box: { borderWidth: 1, borderColor: line, borderRadius: 3, padding: 8, marginBottom: 10, flexDirection: 'row', flexWrap: 'wrap' },
  item: { width: '50%', marginBottom: 4 },
  label: { fontSize: 7, color: muted, fontFamily: 'Helvetica-Bold' },
  value: { fontSize: 9.5 },
  sem: { marginBottom: 10 },
  semHead: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: blue, paddingVertical: 4, paddingHorizontal: 6 },
  semHeadText: { color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  th: { flexDirection: 'row', backgroundColor: soft, paddingVertical: 3, paddingHorizontal: 4 },
  thText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold' },
  tr: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: line },
  c1: { width: '12%' }, c2: { width: '34%' }, c3: { width: '8%', textAlign: 'center' }, c4: { width: '9%', textAlign: 'center' },
  c5: { width: '9%', textAlign: 'center' }, c6: { width: '8%', textAlign: 'center' }, c7: { width: '20%' },
  semFoot: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 3, paddingHorizontal: 6, backgroundColor: soft },
  semFootText: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  totals: { backgroundColor: soft, borderRadius: 3, padding: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-around' },
  tItem: { alignItems: 'center' },
  tVal: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  tLab: { fontSize: 7, color: muted, marginTop: 1 },
  note: { fontSize: 7.5, color: muted, marginBottom: 3 },
  auth: { marginTop: 8, padding: 8, borderWidth: 1, borderColor: line, flexDirection: 'row', justifyContent: 'space-between' },
  authText: { width: '78%', fontSize: 7.5 },
  qr: { width: 76, height: 76 },
  mono: { fontFamily: 'Courier', fontSize: 6.5 },
  footer: { position: 'absolute', bottom: 22, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: muted },
})

const fmt = (n: number | null | undefined, d = 2): string => (n === null || n === undefined ? '-' : Number(n).toFixed(d))

interface Props { issue: OfficialIssue; verifyPage: string; qr: string | null; codeIncluded: boolean }

export function OfficialTranscriptDocument({ issue, verifyPage, qr, codeIncluded }: Props) {
  const b = issue.snapshot.bundle
  const p = b.profile
  const t = b.totals
  const sems = b.semesters.filter(x => x.published_courses > 0)
  const name = `${p.last_name} ${p.first_name}${p.other_names ? ' ' + p.other_names : ''}`
  const issued = new Date(issue.issued_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <Document title={`Official Academic Transcript - ${name}`} author={b.institution.name} subject={`Reference ${issue.reference}`}>
      <Page size="A4" style={s.page}>
        {issue.status !== 'valid' ? <Text fixed style={s.watermark}>WITHDRAWN</Text> : null}

        <View style={s.header}>
          <Text style={s.inst}>{b.institution.name}</Text>
          {b.institution.address ? <Text style={s.small}>{b.institution.address}</Text> : null}
        </View>
        <Text style={s.title}>OFFICIAL ACADEMIC TRANSCRIPT</Text>

        <View style={s.box}>
          <View style={s.item}><Text style={s.label}>Student</Text><Text style={s.value}>{name}</Text></View>
          <View style={s.item}><Text style={s.label}>Matriculation number</Text><Text style={s.value}>{p.admission_number}</Text></View>
          <View style={s.item}><Text style={s.label}>Programme</Text><Text style={s.value}>{p.programme_name}{p.programme_code ? ` (${p.programme_code})` : ''}</Text></View>
          <View style={s.item}><Text style={s.label}>Department</Text><Text style={s.value}>{p.department_name}</Text></View>
          <View style={s.item}><Text style={s.label}>Faculty</Text><Text style={s.value}>{p.faculty_name}</Text></View>
          <View style={s.item}><Text style={s.label}>Reference / date of issue</Text><Text style={s.value}>{issue.reference} / {issued}</Text></View>
        </View>

        <View style={s.totals}>
          <View style={s.tItem}><Text style={s.tVal}>{fmt(t.cgpa)}</Text><Text style={s.tLab}>CUMULATIVE GPA{t.cgpa_scale_max ? ` (OUT OF ${t.cgpa_scale_max.toFixed(1)})` : ''}</Text></View>
          <View style={s.tItem}><Text style={s.tVal}>{fmt(t.credits_attempted, 0)}</Text><Text style={s.tLab}>CREDITS ATTEMPTED</Text></View>
          <View style={s.tItem}><Text style={s.tVal}>{fmt(t.credits_earned, 0)}</Text><Text style={s.tLab}>CREDITS EARNED</Text></View>
        </View>

        {sems.map(sem => (
          <View key={sem.term_id} style={s.sem}>
            <View style={s.semHead} wrap={false}>
              <Text style={s.semHeadText}>{sem.session_name} - {sem.term_name}</Text>
              <Text style={s.semHeadText}>GPA {fmt(sem.gpa)}   |   CGPA {fmt(sem.cgpa_to_date)}</Text>
            </View>
            <View style={s.th} wrap={false}>
              <Text style={[s.thText, s.c1]}>Code</Text><Text style={[s.thText, s.c2]}>Course title</Text>
              <Text style={[s.thText, s.c3]}>Units</Text><Text style={[s.thText, s.c4]}>Score</Text>
              <Text style={[s.thText, s.c5]}>Grade</Text><Text style={[s.thText, s.c6]}>GP</Text><Text style={[s.thText, s.c7]}>Outcome</Text>
            </View>
            {sem.courses.map(c => (
              <View key={c.subject_id} style={s.tr} wrap={false}>
                <Text style={s.c1}>{c.code ?? '-'}</Text>
                <Text style={s.c2}>{c.name}{c.is_repeat ? ` (attempt ${c.attempt_number})` : ''}</Text>
                <Text style={s.c3}>{fmt(c.credit_unit, 0)}</Text><Text style={s.c4}>{fmt(c.total_score, 1)}</Text>
                <Text style={s.c5}>{c.grade_letter ?? '-'}</Text><Text style={s.c6}>{fmt(c.grade_point, 1)}</Text>
                <Text style={s.c7}>{c.outcome ? c.outcome.charAt(0).toUpperCase() + c.outcome.slice(1) : 'Not configured'}</Text>
              </View>
            ))}
            <View style={s.semFoot} wrap={false}>
              <Text style={s.semFootText}>Credits attempted {fmt(sem.credits_attempted, 0)}  |  Credits earned {fmt(sem.credits_earned, 0)}  |  Semester GPA {fmt(sem.gpa)}</Text>
            </View>
          </View>
        ))}

        {b.graduation ? (
          <Text style={s.note}>
            Programme completion approved on {new Date(b.graduation.approved_at).toLocaleDateString('en-NG')}. Final CGPA {fmt(b.graduation.final_cgpa)}
            {b.graduation.classification ? `; classification as awarded: ${b.graduation.classification}` : ''}.
          </Text>
        ) : null}
        <Text style={s.note}>{b.rules.gpa_rule}</Text>
        <Text style={s.note}>{b.rules.earned_rule}</Text>
        <Text style={s.note}>This transcript reflects the published results held by the institution on the date of issue.</Text>

        <View style={s.auth} wrap={false}>
          <View style={s.authText}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Authenticity</Text>
            <Text>This transcript carries no handwritten signature. Its authenticity is confirmed on {verifyPage} with the reference below{codeIncluded ? ' (scan the code to open the check directly)' : ' and the verification code given by the registry'}.</Text>
            <Text>Reference: {issue.reference}</Text>
            <Text>Document fingerprint (SHA-256):</Text>
            <Text style={s.mono}>{issue.snapshot_hash}</Text>
          </View>
          {qr ? <Image src={qr} style={s.qr} /> : null}
        </View>

        <View fixed style={s.footer}>
          <Text>{issue.reference}  |  Issued {issued}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}