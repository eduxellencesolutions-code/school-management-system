'use client'

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const gold = '#C8960C'
const goldLight = '#F5E6B8'
const cream = '#FDFAF4'
const dark = '#0D0D0D'
const muted = '#6B6456'
const border = '#E2D9C8'

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: gold,
    paddingBottom: 12,
    marginBottom: 14,
  },
  logo: { width: 56, height: 56, marginRight: 12 },
  headerText: { flex: 1 },
  schoolName: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: dark },
  schoolMotto: { fontSize: 8.5, color: muted, marginTop: 2, fontFamily: 'Helvetica-Oblique' },
  reportTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    backgroundColor: goldLight,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 12,
    color: dark,
    borderRadius: 3,
  },
  infoBox: {
    backgroundColor: cream,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: border,
    padding: 8,
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  infoItem: { width: '48%' },
  infoLabel: { fontSize: 8, color: muted, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  infoValue: { fontSize: 10, color: dark },
  infoValueBold: { fontSize: 10, color: dark, fontFamily: 'Helvetica-Bold' },
  table: { marginBottom: 12 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: gold,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 3,
    marginBottom: 1,
  },
  tableHeaderCell: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableHeaderCellLeft: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE8DC',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE8DC',
    backgroundColor: cream,
  },
  cellSubject: { fontSize: 9, color: dark, fontFamily: 'Helvetica-Bold', textAlign: 'left' },
  cell: { fontSize: 9, color: dark, textAlign: 'center' },
  cellTotal: { fontSize: 9, color: dark, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  cellRemark: { fontSize: 8.5, color: muted, textAlign: 'left' },
  summary: {
    backgroundColor: goldLight,
    borderRadius: 4,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: dark },
  summaryLabel: { fontSize: 7.5, color: muted, marginTop: 2 },
  remarks: {
    borderWidth: 1,
    borderColor: gold,
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  remarksLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: muted, marginBottom: 3 },
  remarksText: { fontSize: 9, color: dark, lineHeight: 1.5 },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sigBlock: { alignItems: 'center', width: '30%' },
  sigImage: { width: 80, height: 24, marginBottom: 2, objectFit: 'contain' },
  sigLine: { width: 100, borderBottomWidth: 1, borderBottomColor: dark, marginBottom: 3 },
  sigLabel: { fontSize: 7.5, color: muted },
  sigName: { fontSize: 8, color: dark, marginTop: 2 },
})

interface ComponentScore {
  component_id: string
  component_name: string
  score: number
  max_score: number
}

interface SubjectScore {
  subject_id: string
  subject_name: string
  components: ComponentScore[]
  total: number
  max_score: number
  percentage: number
  grade: string
  remark?: string
}

interface PdfOptions {
  show_admission?: boolean
  show_gender?: boolean
  show_position?: boolean
  show_components?: boolean
  show_grade?: boolean
  show_percentage?: boolean
  show_remark?: boolean
  show_term?: boolean
  show_signature?: boolean
}

interface StudentReportCardProps {
  student: {
    id?: string
    first_name: string
    last_name: string
    admission_number?: string
    gender?: string
    scores: SubjectScore[]
    total_score: number
    max_possible: number
    percentage: number
    grade: string
    position: number
    teacher_remark?: string
    principal_remark?: string
  }
  schoolName: string
  schoolLogo?: string
  schoolMotto?: string
  className: string
  termName: string
  sessionName: string
  teacherName: string
  teacherSignature?: string
  principalName?: string
  principalSignature?: string
  pdfOptions?: PdfOptions
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

export function StudentReportCard({
  student,
  schoolName,
  schoolLogo,
  schoolMotto,
  className,
  termName,
  sessionName,
  teacherName,
  teacherSignature,
  principalName,
  principalSignature,
  pdfOptions = {},
}: StudentReportCardProps) {

  // Default options (all true if not specified)
  const opts = {
    show_admission: pdfOptions.show_admission !== false,
    show_gender: pdfOptions.show_gender !== false,
    show_position: pdfOptions.show_position !== false,
    show_components: pdfOptions.show_components !== false,
    show_grade: pdfOptions.show_grade !== false,
    show_percentage: pdfOptions.show_percentage !== false,
    show_remark: pdfOptions.show_remark !== false,
    show_term: pdfOptions.show_term !== false,
    show_signature: pdfOptions.show_signature !== false,
  }

  // Check if components should be shown
  const hasComponents = opts.show_components && student.scores.some(s => s.components && s.components.length > 0)
  
  // Collect all unique component names
  const compNames: string[] = []
  if (hasComponents) {
    student.scores.forEach(s => {
      s.components.forEach(c => {
        if (!compNames.includes(c.component_name)) compNames.push(c.component_name)
      })
    })
  }
  
  const compCount = compNames.length

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          {schoolLogo && <Image src={schoolLogo} style={styles.logo} />}
          <View style={styles.headerText}>
            <Text style={styles.schoolName}>{schoolName}</Text>
            {schoolMotto && <Text style={styles.schoolMotto}>"{schoolMotto}"</Text>}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.reportTitle}>STUDENT RESULT SHEET</Text>

        {/* Student info */}
        <View style={styles.infoBox}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{student.last_name} {student.first_name}</Text>
          </View>
          {opts.show_admission && student.admission_number ? (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Admission No.</Text>
              <Text style={styles.infoValue}>{student.admission_number}</Text>
            </View>
          ) : null}
          {opts.show_gender && student.gender ? (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{student.gender}</Text>
            </View>
          ) : null}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Class</Text>
            <Text style={styles.infoValue}>{className}</Text>
          </View>
          {opts.show_term ? (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Term / Session</Text>
              <Text style={styles.infoValue}>{termName} · {sessionName}</Text>
            </View>
          ) : null}
          {opts.show_position ? (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Position</Text>
              <Text style={[styles.infoValue, { color: gold, fontFamily: 'Helvetica-Bold' }]}>{student.position}</Text>
            </View>
          ) : null}
        </View>

        {/* Scores table */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCellLeft, { width: hasComponents ? '22%' : '32%' }]}>Subject</Text>
            {hasComponents ? (
              <>
                {compNames.map(name => {
                  const colWidth = `${Math.floor((100 - 22 - 11 - (opts.show_percentage ? 9 : 0) - (opts.show_grade ? 7 : 0)) / compCount)}%`
                  return (
                    <Text key={name} style={[styles.tableHeaderCell, { width: colWidth }]}>
                      {name}
                    </Text>
                  )
                })}
                <Text style={[styles.tableHeaderCell, { width: '11%' }]}>Total</Text>
                {opts.show_percentage && <Text style={[styles.tableHeaderCell, { width: '9%' }]}>%</Text>}
                {opts.show_grade && <Text style={[styles.tableHeaderCell, { width: '7%' }]}>Grd</Text>}
              </>
            ) : (
              <>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Score</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Max</Text>
                {opts.show_percentage && <Text style={[styles.tableHeaderCell, { width: '15%' }]}>%</Text>}
                {opts.show_grade && <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Grd</Text>}
                <Text style={[styles.tableHeaderCell, { width: opts.show_remark ? '13%' : '0%', textAlign: 'left' }]}>
                  {opts.show_remark ? 'Remark' : ''}
                </Text>
              </>
            )}
          </View>

          {student.scores.map((subject, idx) => {
            return (
              <View key={subject.subject_id} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.cellSubject, { width: hasComponents ? '22%' : '32%' }]}>
                  {subject.subject_name}
                </Text>
                {hasComponents ? (
                  <>
                    {compNames.map(name => {
                      const comp = subject.components.find(c => c.component_name === name)
                      const colWidth = `${Math.floor((100 - 22 - 11 - (opts.show_percentage ? 9 : 0) - (opts.show_grade ? 7 : 0)) / compCount)}%`
                      return (
                        <Text key={name} style={[styles.cell, { width: colWidth }]}>
                          {comp && comp.score !== undefined && comp.score !== null ? comp.score : '—'}
                        </Text>
                      )
                    })}
                    <Text style={[styles.cellTotal, { width: '11%' }]}>
                      {subject.total}
                    </Text>
                    {opts.show_percentage && (
                      <Text style={[styles.cell, { width: '9%' }]}>
                        {subject.percentage.toFixed(0)}%
                      </Text>
                    )}
                    {opts.show_grade && (
                      <Text style={[styles.cell, { width: '7%', fontFamily: 'Helvetica-Bold', color: gradeColor(subject.grade) }]}>
                        {subject.grade}
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={[styles.cell, { width: '15%' }]}>{subject.total}</Text>
                    <Text style={[styles.cell, { width: '15%' }]}>{subject.max_score}</Text>
                    {opts.show_percentage && (
                      <Text style={[styles.cell, { width: '15%' }]}>{subject.percentage.toFixed(1)}%</Text>
                    )}
                    {opts.show_grade && (
                      <Text style={[styles.cell, { width: '10%', fontFamily: 'Helvetica-Bold', color: gradeColor(subject.grade) }]}>{subject.grade}</Text>
                    )}
                    {opts.show_remark && (
                      <Text style={[styles.cellRemark, { width: '13%' }]}>{subject.remark || ''}</Text>
                    )}
                  </>
                )}
              </View>
            )
          })}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{student.total_score}</Text>
            <Text style={styles.summaryLabel}>Grand Total</Text>
          </View>
          {opts.show_percentage && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{student.percentage.toFixed(1)}%</Text>
              <Text style={styles.summaryLabel}>Percentage</Text>
            </View>
          )}
          {opts.show_grade && (
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: gradeColor(student.grade) }]}>{student.grade}</Text>
              <Text style={styles.summaryLabel}>Grade</Text>
            </View>
          )}
          {opts.show_position && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{student.position}</Text>
              <Text style={styles.summaryLabel}>Position</Text>
            </View>
          )}
        </View>

        {/* Teacher remark */}
        {opts.show_remark && (
          <View style={styles.remarks}>
            <Text style={styles.remarksLabel}>CLASS TEACHER'S REMARK</Text>
            <Text style={styles.remarksText}>
              {student.teacher_remark || 'Student shows satisfactory performance. Keep up the good work!'}
            </Text>
            {student.principal_remark ? (
              <>
                <Text style={[styles.remarksLabel, { marginTop: 6 }]}>PRINCIPAL'S REMARK</Text>
                <Text style={styles.remarksText}>{student.principal_remark}</Text>
              </>
            ) : null}
          </View>
        )}

        {/* Signatures */}
        {opts.show_signature && (
          <View style={styles.footer}>
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>Class Teacher's Signature</Text>
              {teacherSignature ? <Image src={teacherSignature} style={styles.sigImage} /> : null}
              <View style={styles.sigLine} />
              <Text style={styles.sigName}>{teacherName}</Text>
            </View>
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>Principal's Signature</Text>
              {principalSignature ? <Image src={principalSignature} style={styles.sigImage} /> : null}
              <View style={styles.sigLine} />
              <Text style={styles.sigName}>{principalName || 'Principal'}</Text>
            </View>
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>Date</Text>
              <View style={[styles.sigLine, { marginTop: 24 }]} />
              <Text style={styles.sigName}>{new Date().toLocaleDateString('en-NG')}</Text>
            </View>
          </View>
        )}

      </Page>
    </Document>
  )
}
