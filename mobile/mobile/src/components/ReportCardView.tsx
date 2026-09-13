import { View, Text, Image, ScrollView, StyleSheet } from 'react-native'
import { ChildReportCard } from '../lib/supabase/queries/parentReport'
import { EmptyState } from './ui'

const GOLD = '#C8960C'

function gradeColor(grade: string) {
  switch (grade) { case 'A': return '#166534'; case 'B': return '#1E40AF'; case 'C': return '#92400E'; case 'D': return '#9A3412'; case 'E': return '#78350F'; default: return '#991B1B' }
}

export function ReportCardView({ data }: { data: ChildReportCard }) {
  if (!data.report) {
    return <EmptyState message={data.message ?? 'No result available yet.'} />
  }

  const { school, learner, term, report, remarks, signatories } = data
  const compNames: string[] = []
  report.subjects.forEach((s) => s.component_scores?.forEach((c) => { if (!compNames.includes(c.name)) compNames.push(c.name) }))

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {school.logoUrl && <Image source={{ uri: school.logoUrl }} style={styles.logo} resizeMode="contain" />}
        <Text style={styles.schoolName}>{school.name}</Text>
        {school.motto && <Text style={styles.motto}>"{school.motto}"</Text>}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoLine}><Text style={styles.infoLabel}>Name: </Text>{learner.name}</Text>
        {learner.admissionNumber && <Text style={styles.infoLine}><Text style={styles.infoLabel}>Adm. No: </Text>{learner.admissionNumber}</Text>}
        <Text style={styles.infoLine}><Text style={styles.infoLabel}>Class: </Text>{learner.className}</Text>
        <Text style={styles.infoLine}><Text style={styles.infoLabel}>Term: </Text>{term.name} · {term.sessionName}</Text>
        <Text style={styles.infoLine}><Text style={styles.infoLabel}>Position: </Text>{report.position}{report.classSize ? ` of ${report.classSize}` : ''}</Text>
      </View>

      <ScrollView horizontal style={{ marginBottom: 16 }}>
        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.subjectCol]}>Subject</Text>
            {compNames.map((n) => <Text key={n} style={[styles.th, styles.numCol]}>{n}</Text>)}
            <Text style={[styles.th, styles.numCol]}>Total</Text>
            <Text style={[styles.th, styles.numCol]}>%</Text>
            <Text style={[styles.th, styles.numCol]}>Grd</Text>
          </View>
          {report.subjects.map((s, idx) => (
            <View key={s.subject_id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.td, styles.subjectCol, { fontWeight: '700' }]}>{s.subject_name}</Text>
              {compNames.map((n) => {
                const c = s.component_scores?.find((c) => c.name === n)
                return <Text key={n} style={[styles.td, styles.numCol]}>{c?.score ?? '—'}</Text>
              })}
              <Text style={[styles.td, styles.numCol, { fontWeight: '700' }]}>{s.total}</Text>
              <Text style={[styles.td, styles.numCol]}>{s.percentage.toFixed(0)}%</Text>
              <Text style={[styles.td, styles.numCol, { fontWeight: '700', color: gradeColor(s.grade) }]}>{s.grade}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{report.grandTotal}</Text><Text style={styles.summaryLabel}>Grand Total</Text></View>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{report.average.toFixed(1)}</Text><Text style={styles.summaryLabel}>Average</Text></View>
        <View style={styles.summaryItem}><Text style={[styles.summaryValue, { color: gradeColor(report.grade) }]}>{report.grade}</Text><Text style={styles.summaryLabel}>Grade</Text></View>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{report.position}</Text><Text style={styles.summaryLabel}>Position</Text></View>
      </View>

      {remarks.teacher && (
        <View style={styles.remarkBox}>
          <Text style={styles.remarkLabel}>CLASS TEACHER'S REMARK</Text>
          <Text style={styles.remarkText}>{remarks.teacher}</Text>
        </View>
      )}
      {remarks.principal && (
        <View style={styles.remarkBox}>
          <Text style={styles.remarkLabel}>{(signatories.principalTitle ?? 'PRINCIPAL').toUpperCase()}'S REMARK</Text>
          <Text style={styles.remarkText}>{remarks.principal}</Text>
        </View>
      )}

      <View style={styles.signatureRow}>
        <View style={styles.signatureCol}>
          <Text style={styles.sigLabel}>Class Teacher</Text>
          {signatories.teacherSignatureUrl
            ? <Image source={{ uri: signatories.teacherSignatureUrl }} style={styles.sigImage} resizeMode="contain" />
            : <Text style={styles.sigMissing}>Not yet signed</Text>}
          <Text style={styles.sigName}>{signatories.teacherName ?? '—'}</Text>
        </View>
        <View style={styles.signatureCol}>
          <Text style={styles.sigLabel}>{signatories.principalTitle}</Text>
          {signatories.principalSignatureUrl
            ? <Image source={{ uri: signatories.principalSignatureUrl }} style={styles.sigImage} resizeMode="contain" />
            : <Text style={styles.sigMissing}>Not yet signed</Text>}
          <Text style={styles.sigName}>{signatories.principalName ?? '—'}</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  header: { alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: GOLD },
  logo: { width: 50, height: 50, marginBottom: 6 },
  schoolName: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  motto: { fontSize: 11, fontStyle: 'italic', color: '#666', marginTop: 2 },
  infoBox: { backgroundColor: '#fdfaf4', borderWidth: 1, borderColor: '#e2d9c8', borderRadius: 8, padding: 12, marginBottom: 16 },
  infoLine: { fontSize: 13, marginBottom: 4 },
  infoLabel: { fontWeight: '600', color: '#666' },
  tableHeader: { flexDirection: 'row', backgroundColor: GOLD },
  th: { color: '#fff', fontSize: 11, fontWeight: '700', padding: 6, textAlign: 'center' },
  tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  tableRowAlt: { backgroundColor: '#fdfaf4' },
  td: { fontSize: 11, padding: 6, textAlign: 'center' },
  subjectCol: { width: 110, textAlign: 'left' },
  numCol: { width: 60 },
  summaryStrip: { flexDirection: 'row', backgroundColor: '#f5e6b8', borderRadius: 8, padding: 12, marginBottom: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  summaryLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  remarkBox: { borderWidth: 1, borderColor: GOLD, borderRadius: 8, padding: 10, marginBottom: 10 },
  remarkLabel: { fontSize: 10, fontWeight: '700', color: '#666', marginBottom: 4 },
  remarkText: { fontSize: 13, lineHeight: 18 },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee' },
  signatureCol: { alignItems: 'center', width: '45%' },
  sigLabel: { fontSize: 10, color: '#666', marginBottom: 4 },
  sigImage: { height: 32, width: 90, marginBottom: 4 },
  sigMissing: { fontSize: 9, fontStyle: 'italic', color: '#999', marginBottom: 4 },
  sigName: { fontSize: 11, marginTop: 2 },
})