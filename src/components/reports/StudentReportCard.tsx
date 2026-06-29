'use client'

import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'

// Register fonts (optional - for better appearance)
Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2'
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottom: '2px solid #C8960C',
    paddingBottom: 12,
    marginBottom: 16,
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 12,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D0D0D',
  },
  schoolMotto: {
    fontSize: 9,
    color: '#6B6456',
    marginTop: 2,
    fontStyle: 'italic',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#F5E6B8',
    padding: 6,
    marginBottom: 12,
    color: '#0D0D0D',
  },
  studentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#FDFAF4',
    borderRadius: 4,
  },
  studentInfoText: {
    fontSize: 10,
    color: '#0D0D0D',
  },
  studentInfoLabel: {
    fontWeight: 'bold',
    color: '#6B6456',
  },
  table: {
    marginTop: 8,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#C8960C',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottom: '1px solid #E2E8F0',
  },
  tableRowAlternate: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottom: '1px solid #E2E8F0',
    backgroundColor: '#FDFAF4',
  },
  tableCell: {
    fontSize: 9,
    textAlign: 'center',
    color: '#0D0D0D',
  },
  tableCellSubject: {
    fontSize: 9,
    textAlign: 'left',
    color: '#0D0D0D',
    fontWeight: 'bold',
  },
  summary: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F5E6B8',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0D0D0D',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6B6456',
    marginTop: 2,
  },
  remarks: {
    marginTop: 12,
    padding: 10,
    border: '1px solid #C8960C',
    borderRadius: 4,
  },
  remarksTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6B6456',
    marginBottom: 4,
  },
  remarksText: {
    fontSize: 9,
    color: '#0D0D0D',
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTop: '1px solid #E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signature: {
    textAlign: 'center',
    marginTop: 8,
  },
  signatureLine: {
    width: 100,
    borderBottom: '1px solid #0D0D0D',
    marginTop: 12,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#6B6456',
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  gradeA: { backgroundColor: '#DCFCE7', color: '#166534' },
  gradeB: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  gradeC: { backgroundColor: '#FEF3C7', color: '#92400E' },
  gradeD: { backgroundColor: '#FED7AA', color: '#9A3412' },
  gradeE: { backgroundColor: '#FDE68A', color: '#78350F' },
  gradeF: { backgroundColor: '#FEE2E2', color: '#991B1B' },
})

interface StudentReportCardProps {
  student: {
    id: string
    first_name: string
    last_name: string
    admission_number: string
    scores: {
      subject_name: string
      total: number
      max_score: number
      percentage: number
      grade: string
      remark?: string
    }[]
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
}: StudentReportCardProps) {
  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case 'A': return styles.gradeA
      case 'B': return styles.gradeB
      case 'C': return styles.gradeC
      case 'D': return styles.gradeD
      case 'E': return styles.gradeE
      case 'F': return styles.gradeF
      default: return styles.gradeF
    }
  }

  const subjectColumns = [
    { key: 'subject', label: 'Subject', width: '30%' },
    { key: 'score', label: 'Score', width: '12%' },
    { key: 'max', label: 'Max', width: '12%' },
    { key: 'percent', label: '%', width: '12%' },
    { key: 'grade', label: 'Grade', width: '12%' },
    { key: 'remark', label: 'Remark', width: '22%' },
  ]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {schoolLogo && (
            <Image src={schoolLogo} style={styles.logo} />
          )}
          <View>
            <Text style={styles.schoolName}>{schoolName || 'Eduxellence School'}</Text>
            {schoolMotto && <Text style={styles.schoolMotto}>"{schoolMotto}"</Text>}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>ACADEMIC REPORT CARD</Text>

        {/* Student Info */}
        <View style={styles.studentInfo}>
          <Text style={styles.studentInfoText}>
            <Text style={styles.studentInfoLabel}>Name:</Text> {student.last_name} {student.first_name}
          </Text>
          <Text style={styles.studentInfoText}>
            <Text style={styles.studentInfoLabel}>Admission No:</Text> {student.admission_number}
          </Text>
          <Text style={styles.studentInfoText}>
            <Text style={styles.studentInfoLabel}>Class:</Text> {className}
          </Text>
          <Text style={styles.studentInfoText}>
            <Text style={styles.studentInfoLabel}>Term:</Text> {termName} · {sessionName}
          </Text>
        </View>

        {/* Subject Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: subjectColumns[0].width, textAlign: 'left' }]}>
              Subject
            </Text>
            <Text style={[styles.tableHeaderText, { width: subjectColumns[1].width }]}>
              Score
            </Text>
            <Text style={[styles.tableHeaderText, { width: subjectColumns[2].width }]}>
              Max
            </Text>
            <Text style={[styles.tableHeaderText, { width: subjectColumns[3].width }]}>
              %
            </Text>
            <Text style={[styles.tableHeaderText, { width: subjectColumns[4].width }]}>
              Grade
            </Text>
            <Text style={[styles.tableHeaderText, { width: subjectColumns[5].width }]}>
              Remark
            </Text>
          </View>

          {student.scores.map((subject, index) => (
            <View key={subject.subject_name} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlternate}>
              <Text style={[styles.tableCellSubject, { width: subjectColumns[0].width }]}>
                {subject.subject_name}
              </Text>
              <Text style={[styles.tableCell, { width: subjectColumns[1].width }]}>
                {subject.total || '-'}
              </Text>
              <Text style={[styles.tableCell, { width: subjectColumns[2].width }]}>
                {subject.max_score}
              </Text>
              <Text style={[styles.tableCell, { width: subjectColumns[3].width }]}>
                {subject.percentage.toFixed(1)}%
              </Text>
              <Text style={[styles.tableCell, { width: subjectColumns[4].width }]}>
                <Text style={[styles.gradeBadge, getGradeStyle(subject.grade)]}>
                  {subject.grade}
                </Text>
              </Text>
              <Text style={[styles.tableCell, { width: subjectColumns[5].width, textAlign: 'left' }]}>
                {subject.remark || '-'}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{student.total_score.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>Total Score</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{student.percentage.toFixed(1)}%</Text>
            <Text style={styles.summaryLabel}>Percentage</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#C8960C' }]}>{student.grade}</Text>
            <Text style={styles.summaryLabel}>Grade</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{student.position}</Text>
            <Text style={styles.summaryLabel}>Position</Text>
          </View>
        </View>

        {/* Remarks */}
        <View style={styles.remarks}>
          <Text style={styles.remarksTitle}>TEACHER'S REMARK</Text>
          <Text style={styles.remarksText}>
            {student.teacher_remark || 'Student shows satisfactory performance. Keep up the good work!'}
          </Text>
          {student.principal_remark && (
            <>
              <Text style={[styles.remarksTitle, { marginTop: 8 }]}>PRINCIPAL'S REMARK</Text>
              <Text style={styles.remarksText}>{student.principal_remark}</Text>
            </>
          )}
        </View>

        {/* Footer / Signatures */}
        <View style={styles.footer}>
          <View style={styles.signature}>
            <Text style={styles.signatureLabel}>Teacher's Signature</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{teacherName || 'Teacher'}</Text>
          </View>
          <View style={styles.signature}>
            <Text style={styles.signatureLabel}>Principal's Signature</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{principalName || 'Principal'}</Text>
          </View>
          <View style={styles.signature}>
            <Text style={styles.signatureLabel}>Date</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{new Date().toLocaleDateString('en-NG')}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
