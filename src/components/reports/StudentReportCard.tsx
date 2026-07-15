'use client'

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const gold = '#C8960C'
const goldLight = '#F5E6B8'
const cream = '#FDFAF4'
const dark = '#0D0D0D'
const muted = '#6B6456'
const border = '#E2D9C8'

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 10, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'column', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: gold, paddingBottom: 12, marginBottom: 14 },
  logo: { width: 56, height: 56, marginBottom: 6, objectFit: 'contain' },
  schoolName: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: dark, textAlign: 'center' },
  schoolMotto: { fontSize: 8.5, color: muted, marginTop: 2, fontFamily: 'Helvetica-Oblique', textAlign: 'center' },
  schoolAddress: { fontSize: 7.5, color: muted, marginTop: 1, textAlign: 'center' },
  reportTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'center', backgroundColor: goldLight, paddingVertical: 5, paddingHorizontal: 8, marginBottom: 12, color: dark, borderRadius: 3 },
  infoBox: { backgroundColor: cream, borderRadius: 4, borderWidth: 1, borderColor: border, padding: 8, marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  infoItem: { width: '48%' },
  infoLabel: { fontSize: 7.5, color: muted, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  infoValue: { fontSize: 9.5, color: dark },
  infoValueBold: { fontSize: 9.5, color: dark, fontFamily: 'Helvetica-Bold' },
  passport: { width: 50, height: 50, borderRadius: 4, position: 'absolute', top: 8, right: 8, objectFit: 'cover', borderWidth: 1, borderColor: border },
  table: { marginBottom: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: gold, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 3, marginBottom: 1 },
  tableHeaderCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'center' },
  tableHeaderCellLeft: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'left' },
  tableRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#EEE8DC' },
  tableRowAlt: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#EEE8DC', backgroundColor: cream },
  cellSubject: { fontSize: 8.5, color: dark, fontFamily: 'Helvetica-Bold', textAlign: 'left' },
  cell: { fontSize: 8.5, color: dark, textAlign: 'center' },
  cellTotal: { fontSize: 8.5, color: dark, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  summary: { backgroundColor: goldLight, borderRadius: 4, padding: 8, flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: dark },
  summaryLabel: { fontSize: 7, color: muted, marginTop: 1 },
  classStats: { flexDirection: 'row', justifyContent: 'space-around', padding: 6, marginBottom: 10, backgroundColor: cream, borderRadius: 4, borderWidth: 1, borderColor: border },
  classStatsItem: { alignItems: 'center' },
  classStatsValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: dark },
  classStatsLabel: { fontSize: 6.5, color: muted },
  attendance: { flexDirection: 'row', justifyContent: 'space-around', padding: 6, marginBottom: 10, backgroundColor: cream, borderRadius: 4, borderWidth: 1, borderColor: border },
  attendanceItem: { alignItems: 'center' },
  attendanceValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: dark },
  attendanceLabel: { fontSize: 7, color: muted },
  remarks: { borderWidth: 1, borderColor: gold, borderRadius: 4, padding: 8, marginBottom: 10 },
  remarksLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: muted, marginBottom: 2 },
  remarksText: { fontSize: 8.5, color: dark, lineHeight: 1.5 },
  footer: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: border, flexDirection: 'row', justifyContent: 'space-between' },
  sigBlock: { alignItems: 'center', width: '30%' },
  sigImage: { width: 70, height: 20, marginBottom: 2, objectFit: 'contain' },
  sigLine: { width: 80, borderBottomWidth: 1, borderBottomColor: dark, marginBottom: 2 },
  sigLabel: { fontSize: 7, color: muted },
  sigName: { fontSize: 7.5, color: dark, marginTop: 1 },
  sigFallback: { fontSize: 6.5, color: muted, fontFamily: 'Helvetica-Oblique', marginBottom: 2 },
  metaFooter: { marginTop: 8, alignItems: 'center' },
  metaFooterText: { fontSize: 6, color: muted, textAlign: 'center' },
})

// ── Clean, explicit prop shapes — no defaults baked in, no dummy fallback text for content ──

interface ComponentScore {
  name: string
  score: number | null
  max_score: number
}

interface SubjectResult {
  subject_id: string
  subject_name: string
  components: ComponentScore[]
  total: number
  max_score: number
  percentage: number
  grade: string
}

interface Student {
  first_name: string
  last_name: string
  admission_number?: string
  gender?: string
  passport_url?: string
}

interface School {
  name: string
  motto?: string
  logo_url?: string
  address?: string
}

// ✅ FIX 1: Updated Results interface with average field
interface Results {
  subjects: SubjectResult[]
  grand_total: number
  max_possible: number
  average: number        // ✅ new: total ÷ number of subjects
  percentage: number     // kept internally for grade-color logic only, not displayed
  grade: string
  position: number
  class_size?: number
  class_average?: number // average of students' grand totals
}

interface Attendance {
  present: number
  absent: number
  total: number
}

interface StudentRemarks {
  teacher_remark?: string
  principal_remark?: string
}

interface Props {
  student: Student
  school: School
  results: Results
  className: string
  termName: string
  sessionName: string
  attendance?: Attendance
  studentRemarks?: StudentRemarks
  teacherName?: string
  teacherSignature?: string
  principalName?: string
  principalTitle?: string
  principalSignature?: string
  showAttendance?: boolean
  showComponents?: boolean
  showClassStats?: boolean
  reportId?: string
  generatedDate?: string
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#166534'
    case 'B': return '#1E40AF'
    case 'C': return '#92400E'
    case 'D': return '#9A3412'
    case 'E': return '#78350F'
    default:  return '#991B1B'
  }
}

// Safe image wrapper — a broken/expired Supabase URL should never crash PDF generation
function SafeSignature({ url, fallbackLabel }: { url?: string; fallbackLabel: string }) {
  if (!url) {
    return <Text style={styles.sigFallback}>({fallbackLabel} not uploaded)</Text>
  }
  return <Image src={url} style={styles.sigImage} />
}

export function StudentReportCard({
  student,
  school,
  results,
  className,
  termName,
  sessionName,
  attendance,
  studentRemarks,
  teacherName,
  teacherSignature,
  principalName,
  principalTitle,
  principalSignature,
  showAttendance = false,
  showComponents = true,
  showClassStats = true,
  reportId,
  generatedDate,
}: Props) {
  const compNames: string[] = []
  if (showComponents) {
    results.subjects.forEach(s => {
      s.components.forEach(c => {
        if (!compNames.includes(c.name)) compNames.push(c.name)
      })
    })
  }
  const hasComponents = showComponents && compNames.length > 0
  const compCount = compNames.length

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {student.passport_url && (
          <Image src={student.passport_url} style={styles.passport} />
        )}

        <View style={styles.header}>
          {school.logo_url && <Image src={school.logo_url} style={styles.logo} />}
          <Text style={styles.schoolName}>{school.name}</Text>
          {school.motto && <Text style={styles.schoolMotto}>"{school.motto}"</Text>}
          {school.address && <Text style={styles.schoolAddress}>{school.address}</Text>}
        </View>

        <Text style={styles.reportTitle}>ACADEMIC REPORT SHEET</Text>

        <View style={styles.infoBox}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValueBold}>{student.last_name} {student.first_name}</Text>
          </View>
          {student.admission_number && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Admission No.</Text>
              <Text style={styles.infoValue}>{student.admission_number}</Text>
            </View>
          )}
          {student.gender && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{student.gender === 'M' ? 'Male' : student.gender === 'F' ? 'Female' : 'Other'}</Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Class</Text>
            <Text style={styles.infoValue}>{className}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Term / Session</Text>
            <Text style={styles.infoValue}>{termName} · {sessionName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Position</Text>
            <Text style={[styles.infoValue, { color: gold, fontFamily: 'Helvetica-Bold' }]}>
              {results.position}{results.class_size ? ` of ${results.class_size}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCellLeft, { width: hasComponents ? '22%' : '32%' }]}>Subject</Text>
            {hasComponents ? (
              <>
                {compNames.map(name => (
                  <Text key={name} style={[styles.tableHeaderCell, { width: `${Math.floor(61 / compCount)}%` }]}>{name}</Text>
                ))}
                <Text style={[styles.tableHeaderCell, { width: '11%' }]}>Total</Text>
                <Text style={[styles.tableHeaderCell, { width: '9%' }]}>%</Text>
                <Text style={[styles.tableHeaderCell, { width: '7%' }]}>Grd</Text>
              </>
            ) : (
              <>
                <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Score</Text>
                <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Max</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>%</Text>
                <Text style={[styles.tableHeaderCell, { width: '11%' }]}>Grd</Text>
              </>
            )}
          </View>

          {results.subjects.map((subject, idx) => (
            <View key={subject.subject_id} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.cellSubject, { width: hasComponents ? '22%' : '32%' }]}>{subject.subject_name}</Text>
              {hasComponents ? (
                <>
                  {compNames.map(name => {
                    const comp = subject.components.find(c => c.name === name)
                    return (
                      <Text key={name} style={[styles.cell, { width: `${Math.floor(61 / compCount)}%` }]}>
                        {comp && comp.score !== null && comp.score !== undefined ? comp.score : '—'}
                      </Text>
                    )
                  })}
                  <Text style={[styles.cellTotal, { width: '11%' }]}>{subject.total}</Text>
                  <Text style={[styles.cell, { width: '9%' }]}>{subject.percentage.toFixed(0)}%</Text>
                  <Text style={[styles.cell, { width: '7%', fontFamily: 'Helvetica-Bold', color: gradeColor(subject.grade) }]}>{subject.grade}</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.cell, { width: '20%' }]}>{subject.total}</Text>
                  <Text style={[styles.cell, { width: '20%' }]}>{subject.max_score}</Text>
                  <Text style={[styles.cell, { width: '15%' }]}>{subject.percentage.toFixed(1)}%</Text>
                  <Text style={[styles.cell, { width: '11%', fontFamily: 'Helvetica-Bold', color: gradeColor(subject.grade) }]}>{subject.grade}</Text>
                </>
              )}
            </View>
          ))}
        </View>

        {/* ✅ FIX 2: Updated summary box - display Average instead of Percentage */}
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{results.grand_total}</Text>
            <Text style={styles.summaryLabel}>Grand Total</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{results.average.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>Average</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: gradeColor(results.grade) }]}>{results.grade}</Text>
            <Text style={styles.summaryLabel}>Grade</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{results.position}</Text>
            <Text style={styles.summaryLabel}>Position</Text>
          </View>
        </View>

        {/* ✅ FIX 3: Updated class stats label */}
        {showClassStats && results.class_average !== undefined && (
          <View style={styles.classStats}>
            <View style={styles.classStatsItem}>
              <Text style={styles.classStatsValue}>{results.class_size ?? '—'}</Text>
              <Text style={styles.classStatsLabel}>Class Size</Text>
            </View>
            <View style={styles.classStatsItem}>
              <Text style={styles.classStatsValue}>{results.class_average.toFixed(1)}</Text>
              <Text style={styles.classStatsLabel}>Class Avg. Total</Text>
            </View>
          </View>
        )}

        {showAttendance && attendance && (
          <View style={styles.attendance}>
            <View style={styles.attendanceItem}>
              <Text style={[styles.attendanceValue, { color: '#166534' }]}>{attendance.present}</Text>
              <Text style={styles.attendanceLabel}>Present</Text>
            </View>
            <View style={styles.attendanceItem}>
              <Text style={[styles.attendanceValue, { color: '#991B1B' }]}>{attendance.absent}</Text>
              <Text style={styles.attendanceLabel}>Absent</Text>
            </View>
            <View style={styles.attendanceItem}>
              <Text style={styles.attendanceValue}>{attendance.total}</Text>
              <Text style={styles.attendanceLabel}>Total Days</Text>
            </View>
            <View style={styles.attendanceItem}>
              <Text style={[styles.attendanceValue, { color: gold }]}>
                {attendance.total > 0 ? ((attendance.present / attendance.total) * 100).toFixed(0) : '0'}%
              </Text>
              <Text style={styles.attendanceLabel}>Attendance %</Text>
            </View>
          </View>
        )}

        {(studentRemarks?.teacher_remark || studentRemarks?.principal_remark) && (
          <View style={styles.remarks}>
            {studentRemarks?.teacher_remark && (
              <>
                <Text style={styles.remarksLabel}>CLASS TEACHER'S REMARK</Text>
                <Text style={styles.remarksText}>{studentRemarks.teacher_remark}</Text>
              </>
            )}
            {studentRemarks?.principal_remark && (
              <>
                <Text style={[styles.remarksLabel, { marginTop: studentRemarks?.teacher_remark ? 6 : 0 }]}>
                  {(principalTitle || 'PRINCIPAL').toUpperCase()}'S REMARK
                </Text>
                <Text style={styles.remarksText}>{studentRemarks.principal_remark}</Text>
              </>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.sigBlock}>
            <Text style={styles.sigLabel}>Class Teacher's Signature</Text>
            <SafeSignature url={teacherSignature} fallbackLabel="Signature" />
            <View style={styles.sigLine} />
            <Text style={styles.sigName}>{teacherName || '—'}</Text>
          </View>
          <View style={styles.sigBlock}>
            <Text style={styles.sigLabel}>{principalTitle || 'Principal'}'s Signature</Text>
            <SafeSignature url={principalSignature} fallbackLabel="Signature" />
            <View style={styles.sigLine} />
            <Text style={styles.sigName}>{principalName || principalTitle || '—'}</Text>
          </View>
          <View style={styles.sigBlock}>
            <Text style={styles.sigLabel}>Date</Text>
            <View style={[styles.sigLine, { marginTop: 24 }]} />
            <Text style={styles.sigName}>
              {(generatedDate ? new Date(generatedDate) : new Date()).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        <View style={styles.metaFooter}>
          <Text style={styles.metaFooterText}>
            {reportId ? `Report ID: ${reportId} · ` : ''}Generated {(generatedDate ? new Date(generatedDate) : new Date()).toLocaleDateString('en-NG')}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
