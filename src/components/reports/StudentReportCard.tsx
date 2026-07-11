'use client'

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// --- Color scheme ---
const gold = '#C8960C'
const goldLight = '#F5E6B8'
const cream = '#FDFAF4'
const dark = '#0D0D0D'
const muted = '#6B6456'
const border = '#E2D9C8'

// --- Styles ---
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
  schoolAddress: { fontSize: 7.5, color: muted, marginTop: 1 },
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
    gap: 4,
  },
  infoItem: { width: '48%' },
  infoItemFull: { width: '100%' },
  infoLabel: { fontSize: 7.5, color: muted, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  infoValue: { fontSize: 9.5, color: dark },
  infoValueBold: { fontSize: 9.5, color: dark, fontFamily: 'Helvetica-Bold' },
  table: { marginBottom: 10 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: gold,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 3,
    marginBottom: 1,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableHeaderCellLeft: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE8DC',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE8DC',
    backgroundColor: cream,
  },
  cellSubject: { fontSize: 8.5, color: dark, fontFamily: 'Helvetica-Bold', textAlign: 'left' },
  cell: { fontSize: 8.5, color: dark, textAlign: 'center' },
  cellTotal: { fontSize: 8.5, color: dark, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  cellRemark: { fontSize: 7.5, color: muted, textAlign: 'left' },
  summary: {
    backgroundColor: goldLight,
    borderRadius: 4,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: dark },
  summaryLabel: { fontSize: 7, color: muted, marginTop: 1 },
  remarks: {
    borderWidth: 1,
    borderColor: gold,
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
  },
  remarksLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: muted, marginBottom: 2 },
  remarksText: { fontSize: 8.5, color: dark, lineHeight: 1.5 },
  attendance: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 6,
    marginBottom: 10,
    backgroundColor: cream,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: border,
  },
  attendanceItem: { alignItems: 'center' },
  attendanceValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: dark },
  attendanceLabel: { fontSize: 7, color: muted },
  footer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sigBlock: { alignItems: 'center', width: '30%' },
  sigImage: { width: 70, height: 20, marginBottom: 2, objectFit: 'contain' },
  sigLine: { width: 80, borderBottomWidth: 1, borderBottomColor: dark, marginBottom: 2 },
  sigLabel: { fontSize: 7, color: muted },
  sigName: { fontSize: 7.5, color: dark, marginTop: 1 },
  seal: {
    position: 'absolute',
    top: 40,
    right: 40,
    width: 50,
    height: 50,
    opacity: 0.15,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealText: { fontSize: 6, color: gold, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
})

// --- Interfaces ---
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

interface Attendance {
  present: number
  absent: number
  total: number
}

interface Institution {
  id: string
  name: string
  school_name?: string
  motto?: string
  logo_url?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  principal_name?: string
  principal_title?: string
  principal_signature_url?: string
  teacher_signature_url?: string
  colors?: { primary: string; secondary: string }
  report_card_settings?: {
    show_attendance: boolean
    show_remarks: boolean
    show_class_teacher_comment: boolean
    show_principal_signature: boolean
    show_school_seal: boolean
    grade_system: string
    pass_mark: number
  }
}

interface StudentReportCardProps {
  // Student data
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
    attendance?: Attendance
  }
  
  // Institution data (for institutional mode)
  institution?: Institution
  
  // For individual (solo) mode
  schoolName: string
  schoolLogo?: string
  schoolMotto?: string
  className: string
  termName: string
  sessionName: string
  
  // Teacher info
  teacherName: string
  teacherSignature?: string
  
  // Principal info
  principalName?: string
  principalSignature?: string
  
  // Mode
  mode: 'institution' | 'individual'
  
  // Display options
  options?: {
    show_admission?: boolean
    show_gender?: boolean
    show_position?: boolean
    show_components?: boolean
    show_grade?: boolean
    show_percentage?: boolean
    show_remark?: boolean
    show_term?: boolean
    show_signature?: boolean
    show_attendance?: boolean
    show_school_seal?: boolean
  }
}

// --- Helper functions ---
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
  institution,
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
  mode,
  options = {},
}: StudentReportCardProps) {

  // Determine what to display based on mode and options
  const isInstitution = mode === 'institution'
  
  // Get institution settings or use defaults
  const instColors = institution?.colors || { primary: '#1a56db', secondary: '#0f766e' }
  const instSettings = institution?.report_card_settings || {
    show_attendance: true,
    show_remarks: true,
    show_class_teacher_comment: true,
    show_principal_signature: true,
    show_school_seal: true,
    grade_system: 'percentage',
    pass_mark: 40,
  }

  // Merge options with institution settings
  const opts = {
    show_admission: options.show_admission !== false,
    show_gender: options.show_gender !== false,
    show_position: options.show_position !== false,
    show_components: options.show_components !== false,
    show_grade: options.show_grade !== false,
    show_percentage: options.show_percentage !== false,
    show_remark: options.show_remark !== false,
    show_term: options.show_term !== false,
    show_signature: options.show_signature !== false,
    show_attendance: isInstitution ? (options.show_attendance !== false && instSettings.show_attendance) : false,
    show_school_seal: isInstitution ? (options.show_school_seal !== false && instSettings.show_school_seal) : false,
  }

  // Use institution data if available, otherwise use passed props
  const displaySchoolName = isInstitution && institution?.school_name ? institution.school_name : schoolName
  const displaySchoolLogo = isInstitution && institution?.logo_url ? institution.logo_url : schoolLogo
  const displaySchoolMotto = isInstitution && institution?.motto ? institution.motto : schoolMotto
  const displayPrincipalName = isInstitution && institution?.principal_name ? institution.principal_name : principalName
  const displayPrincipalSignature = isInstitution && institution?.principal_signature_url ? institution.principal_signature_url : principalSignature
  const displayTeacherSignature = isInstitution && institution?.teacher_signature_url ? institution.teacher_signature_url : teacherSignature
  const displayPrincipalTitle = isInstitution && institution?.principal_title ? institution.principal_title : 'Principal'

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

  // Check if we need to show attendance
  const showAttendance = opts.show_attendance && student.attendance

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {isInstitution && opts.show_school_seal && (
          <View style={[styles.seal, { borderColor: instColors.primary }]}>
            <Text style={styles.sealText}>SCHOOL{'\n'}SEAL</Text>
          </View>
        )}

        {/* Header with Branding */}
        <View style={[styles.header, { borderBottomColor: isInstitution ? instColors.primary : gold }]}>
          {displaySchoolLogo && <Image src={displaySchoolLogo} style={styles.logo} />}
          <View style={styles.headerText}>
            <Text style={[styles.schoolName, { color: isInstitution ? instColors.primary : dark }]}>
              {displaySchoolName}
            </Text>
            {displaySchoolMotto && <Text style={styles.schoolMotto}>"{displaySchoolMotto}"</Text>}
            {isInstitution && institution?.address && (
              <Text style={styles.schoolAddress}>{institution.address}</Text>
            )}
            {isInstitution && institution?.phone && (
              <Text style={styles.schoolAddress}>{institution.phone}</Text>
            )}
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.reportTitle, { backgroundColor: isInstitution ? goldLight : goldLight }]}>
          {isInstitution ? 'ACADEMIC REPORT SHEET' : 'STUDENT RESULT SHEET'}
        </Text>

        {/* Student info */}
        <View style={[styles.infoBox, { borderColor: isInstitution ? instColors.primary : border }]}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValueBold}>{student.last_name} {student.first_name}</Text>
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
              <Text style={[styles.infoValue, { color: isInstitution ? instColors.primary : gold, fontFamily: 'Helvetica-Bold' }]}>
                {student.position}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Scores table */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={[styles.tableHeader, { backgroundColor: isInstitution ? instColors.primary : gold }]}>
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
            // Determine if this is a pass or fail
            const passMark = instSettings.pass_mark || 40
            const isPass = subject.percentage >= passMark
            
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
                      <Text style={[styles.cell, { width: '9%', color: isPass ? '#166534' : '#991B1B' }]}>
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
                      <Text style={[styles.cell, { width: '15%', color: isPass ? '#166534' : '#991B1B' }]}>
                        {subject.percentage.toFixed(1)}%
                      </Text>
                    )}
                    {opts.show_grade && (
                      <Text style={[styles.cell, { width: '10%', fontFamily: 'Helvetica-Bold', color: gradeColor(subject.grade) }]}>
                        {subject.grade}
                      </Text>
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
        <View style={[styles.summary, { backgroundColor: isInstitution ? goldLight : goldLight }]}>
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

        {/* Attendance (Institution mode only) */}
        {showAttendance && student.attendance && (
          <View style={[styles.attendance, { borderColor: isInstitution ? instColors.primary : border }]}>
            <View style={styles.attendanceItem}>
              <Text style={[styles.attendanceValue, { color: '#166534' }]}>{student.attendance.present}</Text>
              <Text style={styles.attendanceLabel}>Present</Text>
            </View>
            <View style={styles.attendanceItem}>
              <Text style={[styles.attendanceValue, { color: '#991B1B' }]}>{student.attendance.absent}</Text>
              <Text style={styles.attendanceLabel}>Absent</Text>
            </View>
            <View style={styles.attendanceItem}>
              <Text style={[styles.attendanceValue, { color: dark }]}>{student.attendance.total}</Text>
              <Text style={styles.attendanceLabel}>Total Days</Text>
            </View>
            <View style={styles.attendanceItem}>
              <Text style={[styles.attendanceValue, { color: isInstitution ? instColors.primary : gold }]}>
                {((student.attendance.present / student.attendance.total) * 100).toFixed(0)}%
              </Text>
              <Text style={styles.attendanceLabel}>Attendance %</Text>
            </View>
          </View>
        )}

        {/* Remarks */}
        {opts.show_remark && (
          <View style={[styles.remarks, { borderColor: isInstitution ? instColors.primary : gold }]}>
            <Text style={[styles.remarksLabel, { color: isInstitution ? instColors.primary : muted }]}>
              {isInstitution ? 'CLASS TEACHER\'S COMMENT' : 'TEACHER\'S REMARK'}
            </Text>
            <Text style={styles.remarksText}>
              {student.teacher_remark || 'Student shows satisfactory performance. Keep up the good work!'}
            </Text>
            {student.principal_remark && isInstitution ? (
              <>
                <Text style={[styles.remarksLabel, { marginTop: 4, color: isInstitution ? instColors.primary : muted }]}>
                  {`${(institution?.principal_title || 'PRINCIPAL').toUpperCase()}'S COMMENT`}
                </Text>
                <Text style={styles.remarksText}>{student.principal_remark}</Text>
              </>
            ) : null}
          </View>
        )}

        {/* Signatures */}
        {opts.show_signature && (
          <View style={[styles.footer, { borderTopColor: isInstitution ? instColors.primary : border }]}>
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>{isInstitution ? 'Class Teacher\'s Signature' : 'Teacher\'s Signature'}</Text>
              {displayTeacherSignature ? <Image src={displayTeacherSignature} style={styles.sigImage} /> : null}
              <View style={styles.sigLine} />
              <Text style={styles.sigName}>{teacherName}</Text>
            </View>
            {isInstitution && (
              <View style={styles.sigBlock}>
                <Text style={styles.sigLabel}>{`${displayPrincipalTitle}'s Signature`}</Text>
                {displayPrincipalSignature ? <Image src={displayPrincipalSignature} style={styles.sigImage} /> : null}
                <View style={styles.sigLine} />
                <Text style={styles.sigName}>{displayPrincipalName || displayPrincipalTitle}</Text>
              </View>
            )}
            <View style={styles.sigBlock}>
              <Text style={styles.sigLabel}>Date</Text>
              <View style={[styles.sigLine, { marginTop: isInstitution ? 24 : 28 }]} />
              <Text style={styles.sigName}>{new Date().toLocaleDateString('en-NG', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}</Text>
            </View>
          </View>
        )}

        {/* Footer note for individual mode */}
        {!isInstitution && (
          <View style={{ marginTop: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 6, color: muted, textAlign: 'center' }}>
              Generated by GradeMaster Pro • {new Date().toLocaleDateString('en-NG')}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
