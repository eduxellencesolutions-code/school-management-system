// src/components/attendance/DailyRegisterPDF.tsx
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const gold = '#C8960C'
const goldLight = '#F5E6B8'
const dark = '#0D0D0D'
const muted = '#6B6456'
const border = '#E2D9C8'

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: 'Helvetica', fontSize: 7, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'column', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: gold, paddingBottom: 8, marginBottom: 10 },
  logo: { width: 40, height: 40, marginBottom: 4, objectFit: 'contain' },
  schoolName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: dark, textAlign: 'center' },
  reportTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center', backgroundColor: goldLight, paddingVertical: 4, marginBottom: 8, color: dark, borderRadius: 3 },
  reportSubtitle: { fontSize: 7, textAlign: 'center', color: muted, marginBottom: 8 },
  table: { borderWidth: 0.5, borderColor: border },
  tableHeader: { flexDirection: 'row', backgroundColor: gold },
  tableHeaderCell: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.5, borderRightColor: '#FFFFFF' },
  tableHeaderCellLeft: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'left', paddingVertical: 3, paddingLeft: 3, borderRightWidth: 0.5, borderRightColor: '#FFFFFF' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: border },
  cellName: { fontSize: 6.5, color: dark, textAlign: 'left', paddingVertical: 3, paddingLeft: 3, borderRightWidth: 0.5, borderRightColor: border },
  cell: { fontSize: 6.5, textAlign: 'center', paddingVertical: 3, borderRightWidth: 0.5, borderRightColor: border },
  legend: { flexDirection: 'row', gap: 10, marginTop: 8, justifyContent: 'center' },
  legendItem: { fontSize: 6.5, color: muted },
  metaFooter: { marginTop: 8, alignItems: 'center' },
  metaFooterText: { fontSize: 6, color: muted, textAlign: 'center' },
})

const STATUS_SYMBOL: Record<string, string> = { present: 'P', absent: 'A', late: 'L' }
const STATUS_COLOR: Record<string, string> = { present: '#166534', absent: '#991B1B', late: '#92400E' }

interface Props {
  school: { name: string; logo_url?: string }
  classInfo: { name: string; section: string | null; arm: string | null }
  term: { term_name: string; session_name: string }
  students: { learner_id: string; first_name: string; last_name: string; admission_number: string | null }[]
  dailyRegister: { learner_id: string; date: string; status: string }[]
  generatedDate?: string
}

const DATES_PER_PAGE = 15

export function DailyRegisterPDF({ school, classInfo, term, students, dailyRegister, generatedDate }: Props) {
  const allDates = [...new Set(dailyRegister.map(r => r.date))].sort()
  const statusMap = new Map(dailyRegister.map(r => [`${r.learner_id}_${r.date}`, r.status]))
  const classLabel = [classInfo.section, classInfo.name, classInfo.arm].filter(Boolean).join(' ')

  const pages: string[][] = []
  for (let i = 0; i < allDates.length; i += DATES_PER_PAGE) pages.push(allDates.slice(i, i + DATES_PER_PAGE))
  if (pages.length === 0) pages.push([])

  const nameWidth = 22
  const admWidth = 12
  const totalWidth = 100 - nameWidth - admWidth

  return (
    <Document>
      {pages.map((dates, pageIdx) => {
        const colWidth = dates.length > 0 ? totalWidth / dates.length : totalWidth
        return (
          <Page key={pageIdx} size="A4" orientation="landscape" style={styles.page}>
            <View style={styles.header}>
              {school.logo_url && <Image src={school.logo_url} style={styles.logo} />}
              <Text style={styles.schoolName}>{school.name}</Text>
            </View>
            <Text style={styles.reportTitle}>DAILY ATTENDANCE REGISTER</Text>
            <Text style={styles.reportSubtitle}>
              {classLabel} · {term.session_name} — {term.term_name}
              {pages.length > 1 ? ` · Page ${pageIdx + 1} of ${pages.length}` : ''}
            </Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCellLeft, { width: `${nameWidth}%` }]}>Student</Text>
                <Text style={[styles.tableHeaderCell, { width: `${admWidth}%` }]}>Adm. No.</Text>
                {dates.map(d => (
                  <Text key={d} style={[styles.tableHeaderCell, { width: `${colWidth}%` }]}>
                    {new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}
                  </Text>
                ))}
              </View>
              {students.map(s => (
                <View key={s.learner_id} style={styles.tableRow}>
                  <Text style={[styles.cellName, { width: `${nameWidth}%` }]}>{s.last_name} {s.first_name}</Text>
                  <Text style={[styles.cell, { width: `${admWidth}%` }]}>{s.admission_number ?? '—'}</Text>
                  {dates.map(d => {
                    const status = statusMap.get(`${s.learner_id}_${d}`)
                    return (
                      <Text key={d} style={[styles.cell, { width: `${colWidth}%`, color: status ? STATUS_COLOR[status] : '#CCCCCC', fontFamily: 'Helvetica-Bold' }]}>
                        {status ? STATUS_SYMBOL[status] : '—'}
                      </Text>
                    )
                  })}
                </View>
              ))}
            </View>

            <View style={styles.legend}>
              <Text style={styles.legendItem}>P = Present</Text>
              <Text style={styles.legendItem}>A = Absent</Text>
              <Text style={styles.legendItem}>L = Late</Text>
              <Text style={styles.legendItem}>— = Not Recorded</Text>
            </View>

            <View style={styles.metaFooter}>
              <Text style={styles.metaFooterText}>
                EDUXELLENCE RESULTS · Generated electronically by Eduxellence Results on {(generatedDate ? new Date(generatedDate) : new Date()).toLocaleDateString('en-NG')}
              </Text>
            </View>
          </Page>
        )
      })}
    </Document>
  )
}