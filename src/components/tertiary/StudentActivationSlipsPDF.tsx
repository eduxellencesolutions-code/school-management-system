// FILE: src/components/tertiary/StudentActivationSlipsPDF.tsx
'use client'

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

// Same palette as TertiaryTranscript.tsx / StudentReportCard.tsx.
const gold = '#C8960C'
const goldLight = '#F5E6B8'
const cream = '#FDFAF4'
const dark = '#0D0D0D'
const muted = '#6B6456'
const border = '#E2D9C8'

const styles = StyleSheet.create({
  page: { padding: 24, fontFamily: 'Helvetica', fontSize: 9, backgroundColor: '#FFFFFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slip: {
    width: '48%', borderWidth: 1, borderColor: border, borderRadius: 4,
    padding: 10, marginBottom: 10, backgroundColor: cream,
  },
  slipHeader: {
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1,
    borderBottomColor: gold, paddingBottom: 6, marginBottom: 6, gap: 6,
  },
  logo: { width: 28, height: 28, objectFit: 'contain' },
  institutionName: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: dark, flexShrink: 1 },
  docTitle: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', textAlign: 'center',
    backgroundColor: goldLight, paddingVertical: 3, marginBottom: 6, color: dark, borderRadius: 3,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  label: { fontSize: 7, color: muted, fontFamily: 'Helvetica-Bold' },
  value: { fontSize: 9, color: dark, fontFamily: 'Helvetica-Bold' },
  tokenBox: {
    marginTop: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderStyle: 'dashed',
    borderColor: gold, borderRadius: 3, padding: 6, alignItems: 'center',
  },
  tokenLabel: { fontSize: 6.5, color: muted, marginBottom: 2 },
  tokenValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: gold, letterSpacing: 0.5 },
  expiryText: { fontSize: 6.5, color: muted, marginTop: 4, textAlign: 'center' },
  instructions: { fontSize: 6, color: muted, marginTop: 6, textAlign: 'center', fontStyle: 'italic' },
})

interface SlipEntry {
  admission_number: string
  first_name: string
  last_name: string
  token: string
  expires_at: string
}

interface Props {
  institution: { name: string; logo_url?: string }
  portalUrl: string
  students: SlipEntry[]
  generatedDate?: string
}

export function StudentActivationSlipsPDF({ institution, portalUrl, students, generatedDate }: Props) {
  // 4 slips per page, matching the 2-column grid's natural wrap.
  const pages: SlipEntry[][] = []
  for (let i = 0; i < students.length; i += 4) {
    pages.push(students.slice(i, i + 4))
  }

  return (
    <Document>
      {pages.map((pageStudents, pageIdx) => (
        <Page key={pageIdx} size="A4" style={styles.page}>
          <View style={styles.grid}>
            {pageStudents.map((s) => (
              <View key={s.admission_number} style={styles.slip}>
                <View style={styles.slipHeader}>
                  {institution.logo_url && <Image src={institution.logo_url} style={styles.logo} />}
                  <Text style={styles.institutionName}>{institution.name}</Text>
                </View>
                <Text style={styles.docTitle}>STUDENT PORTAL ACTIVATION</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Name</Text>
                  <Text style={styles.value}>{s.last_name} {s.first_name}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Admission No.</Text>
                  <Text style={styles.value}>{s.admission_number}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Portal</Text>
                  <Text style={[styles.value, { fontSize: 7.5 }]}>{portalUrl}</Text>
                </View>
                <View style={styles.tokenBox}>
                  <Text style={styles.tokenLabel}>ACTIVATION CODE</Text>
                  <Text style={styles.tokenValue}>{s.token}</Text>
                  <Text style={styles.expiryText}>
                    Expires {new Date(s.expires_at).toLocaleDateString('en-NG')}
                  </Text>
                </View>
                <Text style={styles.instructions}>
                  Visit the portal, enter your admission number and this code, then set your password.
                  This code is single-use and cannot be reused once activated.
                </Text>
              </View>
            ))}
          </View>
        </Page>
      ))}
      <Page size="A4" style={styles.page}>
        <Text style={{ fontSize: 6.5, color: muted, textAlign: 'center' }}>
          {students.length} activation slip(s) generated{' '}
          {(generatedDate ? new Date(generatedDate) : new Date()).toLocaleDateString('en-NG')} ·{' '}
          Keep these codes confidential — each is valid for one student only.
        </Text>
      </Page>
    </Document>
  )
}