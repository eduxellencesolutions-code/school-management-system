// FILE: src/lib/results/statementPdf.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ResultsBundle } from './bundleTypes'

const blue = '#1C6EF2'
const ink = '#0D1117'
const muted = '#5A6472'
const line = '#D8D4CC'
const soft = '#F3F5FA'

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 60, paddingHorizontal: 36, fontFamily: 'Helvetica', fontSize: 9, color: ink },
  watermark: { position: 'absolute', top: 330, left: 70, fontSize: 96, color: '#EEF1F6', transform: 'rotate(-30deg)', fontFamily: 'Helvetica-Bold' },
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
  c1: { width: '12%' }, c2: { width: '33%' }, c3: { width: '8%', textAlign: 'center' }, c4: { width: '9%', textAlign: 'center' },
  c5: { width: '9%', textAlign: 'center' }, c6: { width: '8%', textAlign: 'center' }, c7: { width: '21%' },
  semFoot: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 3, paddingHorizontal: 6, backgroundColor: soft },
  semFootText: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  totals: { backgroundColor: soft, borderRadius: 3, padding: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-around' },
  tItem: { alignItems: 'center' },
  tVal: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  tLab: { fontSize: 7, color: muted, marginTop: 1 },
  note: { fontSize: 7.5, color: muted, marginBottom: 3 },
  disclaimer: { fontSize: 8, marginTop: 6, padding: 6, borderWidth: 1, borderColor: line },
  footer: { position: 'absolute', bottom: 22, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: muted },
})

const fmt = (n: number | null | undefined, d = 2): string => (n === null || n === undefined ? '-' : Number(n).toFixed(d))

interface Props { bundle: ResultsBundle; reference: string; generatedAt: string }

export function StatementDocument({ bundle, reference, generatedAt }: Props) {
  const p = bundle.profile
  const t = bundle.totals
  const sems = bundle.semesters.filter(x => x.published_courses > 0)
  const fullName = `${p.last_name} ${p.first_name}${p.other_names ? ' ' + p.other_names : ''}`
  const when = new Date(generatedAt).toLocaleString('en-NG')

  return (
    <Document title={`Statement of Results (Unofficial) - ${fullName}`} author={bundle.institution.name} subject="Unofficial statement of results">
      <Page size="A4" style={s.page}>
        <Text fixed style={s.watermark}>UNOFFICIAL</Text>

        <View style={s.header}>
          <Text style={s.inst}>{bundle.institution.name}</Text>
          {bundle.institution.address ? <Text style={s.small}>{bundle.institution.address}</Text> : null}
        </View>
        <Text style={s.title}>STATEMENT OF RESULTS - UNOFFICIAL</Text>

        <View style={s.box}>
          <View style={s.item}><Text style={s.label}>Student</Text><Text style={s.value}>{fullName}</Text></View>
          <View style={s.item}><Text style={s.label}>Matriculation number</Text><Text style={s.value}>{p.admission_number}</Text></View>
          <View style={s.item}><Text style={s.label}>Programme</Text><Text style={s.value}>{p.programme_name}{p.programme_code ? ` (${p.programme_code})` : ''}</Text></View>
          <View style={s.item}><Text style={s.label}>Department</Text><Text style={s.value}>{p.department_name}</Text></View>
          <View style={s.item}><Text style={s.label}>Faculty</Text><Text style={s.value}>{p.faculty_name}</Text></View>
          <View style={s.item}><Text style={s.label}>Level / status</Text><Text style={s.value}>{p.current_level ?? '-'} / {p.academic_status ?? '-'}</Text></View>
        </View>

        <View style={s.totals}>
          <View style={s.tItem}><Text style={s.tVal}>{fmt(t.cgpa)}</Text><Text style={s.tLab}>CUMULATIVE GPA{t.cgpa_scale_max ? ` (OUT OF ${t.cgpa_scale_max.toFixed(1)})` : ''}</Text></View>
          <View style={s.tItem}><Text style={s.tVal}>{fmt(t.credits_attempted, 0)}</Text><Text style={s.tLab}>CREDITS ATTEMPTED</Text></View>
          <View style={s.tItem}><Text style={s.tVal}>{fmt(t.credits_earned, 0)}</Text><Text style={s.tLab}>CREDITS EARNED</Text></View>
          <View style={s.tItem}><Text style={s.tVal}>{t.credits_required ? fmt(t.credits_remaining, 0) : '-'}</Text><Text style={s.tLab}>{t.credits_required ? `REMAINING OF ${t.credits_required}` : 'REQUIREMENT NOT SET'}</Text></View>
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
            {sem.pending_courses > 0 ? <Text style={s.note}>{sem.pending_courses} registered course(s) in this semester have no published result yet.</Text> : null}
          </View>
        ))}

        {bundle.graduation ? (
          <Text style={s.note}>
            Programme completion approval recorded by the institution on {new Date(bundle.graduation.approved_at).toLocaleDateString('en-NG')}.
            Final CGPA {fmt(bundle.graduation.final_cgpa)}{bundle.graduation.classification ? `; classification as recorded: ${bundle.graduation.classification}` : ''}.
          </Text>
        ) : null}

        <Text style={s.note}>{bundle.rules.gpa_rule}</Text>
        <Text style={s.note}>{bundle.rules.earned_rule}</Text>

        <View style={s.disclaimer} wrap={false}>
          <Text>
            This is an unofficial statement generated from published results for personal use. It is not a transcript, carries no signature or seal,
            and must not be treated as proof of results for admission, employment or verification. Official transcripts are issued only by the
            institution&apos;s registry.
          </Text>
        </View>

        <View fixed style={s.footer}>
          <Text>Reference {reference}  |  Generated {when}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}