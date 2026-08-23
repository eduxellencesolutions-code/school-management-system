// src/components/attendance/AttendanceReportPDF.tsx
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const gold = '#C8960C'
const goldLight = '#F5E6B8'
const dark = '#0D0D0D'
const muted = '#6B6456'
const border = '#E2D9C8'
const cream = '#FDFAF4'

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 9, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'column', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: gold, paddingBottom: 12, marginBottom: 14 },
  logo: { width: 56, height: 56, marginBottom: 6, objectFit: 'contain' },
  schoolName: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: dark, textAlign: 'center' },
  schoolAddress: { fontSize: 7.5, color: muted, marginTop: 1, textAlign: 'center' },
  reportTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'center', backgroundColor: goldLight, paddingVertical: 5, paddingHorizontal: 8, marginBottom: 12, color: dark, borderRadius: 3 },
  reportSubtitle: { fontSize: 8, textAlign: 'center', color: muted, marginBottom: 10 },
  infoBox: { backgroundColor: cream, borderRadius: 4, borderWidth: 1, borderColor: border, padding: 8, marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  infoItem: { width: '33%' },
  infoLabel: { fontSize: 7, color: muted, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  infoValue: { fontSize: 9, color: dark },
  summary: { backgroundColor: goldLight, borderRadius: 4, padding: 8, flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: dark },
  summaryLabel: { fontSize: 6.5, color: muted, marginTop: 1 },
  table: { marginBottom: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: gold, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 3, marginBottom: 1 },
  tableHeaderCell: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'center' },
  tableHeaderCellLeft: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'left' },
  tableRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#EEE8DC' },
  tableRowAlt: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#EEE8DC', backgroundColor: cream },
  cellName: { fontSize: 8, color: dark, fontFamily: 'Helvetica-Bold', textAlign: 'left' },
  cell: { fontSize: 8, color: dark, textAlign: 'center' },
  cellFlag: { fontSize: 8, textAlign: 'center', fontFamily: 'Helvetica-Bold', color: '#991B1B' },
  footerInstitution: { marginTop: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: border, flexDirection: 'row', justifyContent: 'space-between' },
  sigBlock: { alignItems: 'center', width: '30%' },
  sigLine: { width: 100, borderBottomWidth: 0.75, borderBottomColor: dark, marginBottom: 2, marginTop: 20 },
  sigLabel: { fontSize: 7, color: muted, marginBottom: 2 },
  sigTitle: { fontSize: 6, color: muted, fontFamily: 'Helvetica-Oblique', marginTop: 1 },
  metaFooter: { marginTop: 10, alignItems: 'center' },
  metaFooterText: { fontSize: 6, color: muted, textAlign: 'center' },
})

interface StudentRow {
  learner_id: string
  first_name: string
  last_name: string
  admission_number: string | null
  days_present: number
  days_absent: number
  days_late: number
  days_recorded: number
  attendance_percentage: number | null
}

interface Props {
  school: { name: string; logo_url?: string; address?: string }
  classInfo: { name: string; section: string | null; arm: string | null; class_teacher_name: string | null; registered_students: number }
  term: { term_name: string; session_name: string }
  period: { start_date: string; end_date: string }
  schoolDays: number
  students: StudentRow[]
  preparedByName?: string
  preparedByTitle?: string
  generatedDate?: string
}

export function AttendanceReportPDF({ school, classInfo, term, period, schoolDays, students, preparedByName, preparedByTitle, generatedDate }: Props) {
  const withPercentage = students.filter(s => s.attendance_percentage !== null)
  const avgAttendance = withPercentage.length > 0
    ? withPercentage.reduce((sum, s) => sum + (s.attendance_percentage ?? 0), 0) / withPercentage.length
    : 0
  const below80 = withPercentage.filter(s => (s.attendance_percentage ?? 100) < 80).length

  const classLabel = [classInfo.section, classInfo.name, classInfo.arm].filter(Boolean).join(' ')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {school.logo_url && <Image src={school.logo_url} style={styles.logo} />}
          <Text style={styles.schoolName}>{school.name}</Text>
          {school.address && <Text style={styles.schoolAddress}>{school.address}</Text>}
        </View>

        <Text style={styles.reportTitle}>STUDENT ATTENDANCE REPORT</Text>
        <Text style={styles.reportSubtitle}>
          {term.session_name} — {term.term_name} · {new Date(period.start_date).toLocaleDateString('en-NG')} to {new Date(period.end_date).toLocaleDateString('en-NG')}
        </Text>

        <View style={styles.infoBox}>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>Class</Text><Text style={styles.infoValue}>{classLabel}</Text></View>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>Class Teacher</Text><Text style={styles.infoValue}>{classInfo.class_teacher_name ?? '—'}</Text></View>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>Registered Students</Text><Text style={styles.infoValue}>{classInfo.registered_students}</Text></View>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryItem}><Text style={styles.summaryValue}>{students.length}</Text><Text style={styles.summaryLabel}>Total Students</Text></View>
          <View style={styles.summaryItem}><Text style={styles.summaryValue}>{schoolDays}</Text><Text style={styles.summaryLabel}>Total School Days</Text></View>
          <View style={styles.summaryItem}><Text style={styles.summaryValue}>{avgAttendance.toFixed(1)}%</Text><Text style={styles.summaryLabel}>Average Attendance</Text></View>
          <View style={styles.summaryItem}><Text style={[styles.summaryValue, below80 > 0 ? { color: '#991B1B' } : {}]}>{below80}</Text><Text style={styles.summaryLabel}>Below 80% Attendance</Text></View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCellLeft, { width: '30%' }]}>Student</Text>
            <Text style={[styles.tableHeaderCell, { width: '16%' }]}>Adm. No.</Text>
            <Text style={[styles.tableHeaderCell, { width: '13%' }]}>Present</Text>
            <Text style={[styles.tableHeaderCell, { width: '13%' }]}>Absent</Text>
            <Text style={[styles.tableHeaderCell, { width: '13%' }]}>Late</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Attendance %</Text>
          </View>
          {students.map((s, idx) => (
            <View key={s.learner_id} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.cellName, { width: '30%' }]}>{s.last_name} {s.first_name}</Text>
              <Text style={[styles.cell, { width: '16%' }]}>{s.admission_number ?? '—'}</Text>
              <Text style={[styles.cell, { width: '13%' }]}>{s.days_present}</Text>
              <Text style={[styles.cell, { width: '13%' }]}>{s.days_absent}</Text>
              <Text style={[styles.cell, { width: '13%' }]}>{s.days_late}</Text>
              <Text style={[s.attendance_percentage !== null && s.attendance_percentage < 80 ? styles.cellFlag : styles.cell, { width: '15%' }]}>
                {s.attendance_percentage !== null ? `${s.attendance_percentage}%` : '—'}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footerInstitution}>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Prepared by</Text>
            <Text style={styles.sigTitle}>{preparedByName ?? '—'}{preparedByTitle ? ` · ${preparedByTitle}` : ''}</Text>
          </View>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Head Teacher / Principal Signature</Text>
          </View>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>School Stamp</Text>
          </View>
        </View>

        <View style={styles.metaFooter}>
          <Text style={styles.metaFooterText}>
            EDUXELLENCE RESULTS · Generated electronically by Eduxellence Results on {(generatedDate ? new Date(generatedDate) : new Date()).toLocaleDateString('en-NG')}
          </Text>
        </View>
      </Page>
    </Document>
  )
}