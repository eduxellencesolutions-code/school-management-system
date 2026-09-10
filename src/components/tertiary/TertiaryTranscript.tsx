// FILE: src/components/tertiary/TertiaryTranscript.tsx
'use client'

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// Same palette as StudentReportCard.tsx — brand consistency across the platform.
const gold = '#C8960C'
const goldLight = '#F5E6B8'
const cream = '#FDFAF4'
const dark = '#0D0D0D'
const muted = '#6B6456'
const border = '#E2D9C8'

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 9.5, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'column', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: gold, paddingBottom: 12, marginBottom: 14 },
  logo: { width: 56, height: 56, marginBottom: 6, objectFit: 'contain' },
  institutionName: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: dark, textAlign: 'center' },
  institutionMotto: { fontSize: 8.5, color: muted, marginTop: 2, fontFamily: 'Helvetica-Oblique', textAlign: 'center' },
  institutionAddress: { fontSize: 7.5, color: muted, marginTop: 1, textAlign: 'center' },
  docTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'center', backgroundColor: goldLight, paddingVertical: 5, paddingHorizontal: 8, marginBottom: 12, color: dark, borderRadius: 3 },
  infoBox: { backgroundColor: cream, borderRadius: 4, borderWidth: 1, borderColor: border, padding: 8, marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  infoItem: { width: '48%' },
  infoLabel: { fontSize: 7.5, color: muted, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  infoValue: { fontSize: 9.5, color: dark },
  infoValueBold: { fontSize: 9.5, color: dark, fontFamily: 'Helvetica-Bold' },
  termBlock: { marginBottom: 10 },
  termHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: gold, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 3, marginBottom: 1 },
  termHeaderText: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  tableHeader: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, backgroundColor: goldLight },
  tableHeaderCell: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: dark, textAlign: 'center' },
  tableHeaderCellLeft: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: dark, textAlign: 'left' },
  tableRow: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#EEE8DC' },
  tableRowAlt: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#EEE8DC', backgroundColor: cream },
  cellCode: { fontSize: 8, color: dark, fontFamily: 'Helvetica-Bold', textAlign: 'left', width: '15%' },
  cellName: { fontSize: 8, color: dark, textAlign: 'left', width: '35%' },
  cell: { fontSize: 8, color: dark, textAlign: 'center', width: '12.5%' },
  termGpaRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 3, paddingHorizontal: 6, backgroundColor: cream },
  termGpaText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: dark },
  cumulativeBox: { backgroundColor: goldLight, borderRadius: 4, padding: 10, flexDirection: 'row', justifyContent: 'space-around', marginTop: 6, marginBottom: 12 },
  cumulativeItem: { alignItems: 'center' },
  cumulativeValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: dark },
  cumulativeLabel: { fontSize: 7, color: muted, marginTop: 1 },
  disclaimer: { fontSize: 6.5, color: muted, fontStyle: 'italic', marginBottom: 10, textAlign: 'center' },
  footer: { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: border, flexDirection: 'row', justifyContent: 'flex-end' },
  sigBlock: { alignItems: 'center', width: '35%' },
  sigFallbackBox: { width: 100, height: 26, borderWidth: 0.5, borderStyle: 'dashed', borderColor: border, justifyContent: 'center', alignItems: 'center', marginBottom: 1 },
  sigFallback: { fontSize: 6.5, color: muted, fontFamily: 'Helvetica-Oblique' },
  sigLine: { width: 100, borderBottomWidth: 0.75, borderBottomColor: dark, marginBottom: 2 },
  sigLabel: { fontSize: 7, color: muted, marginBottom: 2 },
  sigTitle: { fontSize: 6, color: muted, fontFamily: 'Helvetica-Oblique', marginTop: 1 },
  metaFooter: { marginTop: 10, alignItems: 'center' },
  metaFooterText: { fontSize: 6, color: muted, textAlign: 'center' },
})

interface Course {
  subject_id: string; code: string; name: string; credit_unit: number
  total_score: number; grade_letter: string; grade_point: number; quality_points: number
}
interface TermEntry {
  term_id: string; term_name: string; session_name: string
  gpa_detail: { gpa: number | null; total_credit_units: number; courses: Course[] }
}
interface Props {
  institution: { name: string; logo_url?: string; address?: string; motto?: string }
  profile: {
    first_name: string; last_name: string; admission_number: string
    programme_name: string; programme_code?: string; department_name: string
    faculty_name: string; current_level: string; academic_status: string
  }
  cgpa: { cgpa: number | null; total_credit_units: number; total_quality_points: number }
  terms: TermEntry[]
  generatedDate?: string
}

function SafeSignature() {
  return (
    <View style={styles.sigFallbackBox}>
      <Text style={styles.sigFallback}>Not yet signed</Text>
    </View>
  )
}

export function TertiaryTranscript({ institution, profile, cgpa, terms, generatedDate }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {institution.logo_url && <Image src={institution.logo_url} style={styles.logo} />}
          <Text style={styles.institutionName}>{institution.name}</Text>
          {institution.motto && <Text style={styles.institutionMotto}>"{institution.motto}"</Text>}
          {institution.address && <Text style={styles.institutionAddress}>{institution.address}</Text>}
        </View>

        <Text style={styles.docTitle}>OFFICIAL ACADEMIC TRANSCRIPT</Text>

        <View style={styles.infoBox}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Student Name</Text>
            <Text style={styles.infoValueBold}>{profile.last_name} {profile.first_name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Matriculation Number</Text>
            <Text style={styles.infoValue}>{profile.admission_number}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Programme</Text>
            <Text style={styles.infoValue}>{profile.programme_name}{profile.programme_code ? ` (${profile.programme_code})` : ''}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>{profile.department_name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Faculty</Text>
            <Text style={styles.infoValue}>{profile.faculty_name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Current Level / Status</Text>
            <Text style={styles.infoValue}>{profile.current_level} · {profile.academic_status}</Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>
          This transcript reflects only Senate-approved, published results as of the generation date below.
        </Text>

        {terms.map(term => (
          <View key={term.term_id} style={styles.termBlock}>
            <View style={styles.termHeader}>
              <Text style={styles.termHeaderText}>{term.session_name} — {term.term_name}</Text>
              <Text style={styles.termHeaderText}>GPA: {term.gpa_detail.gpa ?? '—'}</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCellLeft, { width: '15%' }]}>Code</Text>
              <Text style={[styles.tableHeaderCellLeft, { width: '35%' }]}>Course Title</Text>
              <Text style={[styles.tableHeaderCell, { width: '12.5%' }]}>Units</Text>
              <Text style={[styles.tableHeaderCell, { width: '12.5%' }]}>Score</Text>
              <Text style={[styles.tableHeaderCell, { width: '12.5%' }]}>Grade</Text>
              <Text style={[styles.tableHeaderCell, { width: '12.5%' }]}>GP</Text>
            </View>
            {term.gpa_detail.courses.map((c, idx) => (
              <View key={c.subject_id} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={styles.cellCode}>{c.code}</Text>
                <Text style={styles.cellName}>{c.name}</Text>
                <Text style={styles.cell}>{c.credit_unit}</Text>
                <Text style={styles.cell}>{c.total_score}</Text>
                <Text style={styles.cell}>{c.grade_letter}</Text>
                <Text style={styles.cell}>{c.grade_point}</Text>
              </View>
            ))}
            <View style={styles.termGpaRow}>
              <Text style={styles.termGpaText}>Term credit units: {term.gpa_detail.total_credit_units} · Term GPA: {term.gpa_detail.gpa ?? '—'}</Text>
            </View>
          </View>
        ))}

        <View style={styles.cumulativeBox}>
          <View style={styles.cumulativeItem}>
            <Text style={styles.cumulativeValue}>{cgpa.total_credit_units}</Text>
            <Text style={styles.cumulativeLabel}>Total Credit Units</Text>
          </View>
          <View style={styles.cumulativeItem}>
            <Text style={styles.cumulativeValue}>{cgpa.total_quality_points}</Text>
            <Text style={styles.cumulativeLabel}>Total Quality Points</Text>
          </View>
          <View style={styles.cumulativeItem}>
            <Text style={[styles.cumulativeValue, { color: gold }]}>{cgpa.cgpa ?? '—'}</Text>
            <Text style={styles.cumulativeLabel}>Cumulative GPA</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.sigBlock}>
            <Text style={styles.sigLabel}>Registrar's Signature</Text>
            <SafeSignature />
            <View style={styles.sigLine} />
            <Text style={styles.sigTitle}>Registrar / Examinations & Records</Text>
          </View>
        </View>

        <View style={styles.metaFooter}>
          <Text style={styles.metaFooterText}>
            System-generated transcript · Not valid without Registrar authentication · Generated {(generatedDate ? new Date(generatedDate) : new Date()).toLocaleDateString('en-NG')}
          </Text>
        </View>
      </Page>
    </Document>
  )
}