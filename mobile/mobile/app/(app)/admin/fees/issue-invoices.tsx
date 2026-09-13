import { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, Switch, Alert } from 'react-native'
import { useAuth } from '../../../../src/lib/auth/AuthContext'
import { loadFeeStructuresContext, previewBulkIssue, bulkIssueInvoices, BulkIssuePreview, BulkIssueResult, Term, FeeStructure } from '../../../../src/lib/supabase/queries/financeApi'
import { LoadingState, ErrorState, EmptyState } from '../../../../src/components/ui'

export default function IssueInvoicesScreen() {
  const { profile } = useAuth()
  const [terms, setTerms] = useState<Term[]>([])
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([])
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [termId, setTermId] = useState('')
  const [structureId, setStructureId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [override, setOverride] = useState(false)
  const [preview, setPreview] = useState<BulkIssuePreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [result, setResult] = useState<BulkIssueResult | null>(null)

  useEffect(() => {
    if (!profile?.organizationId) return
    loadFeeStructuresContext(profile.organizationId)
      .then((r) => { setTerms(r.terms); setGroups(r.groups); setStructures(r.structures); if (r.terms[0]) setTermId(r.terms[0].id) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [profile])

  const structuresForTerm = useMemo(() => structures.filter((s) => s.termId === termId), [structures, termId])
  const selectedStructure = useMemo(() => structures.find((s) => s.id === structureId) ?? null, [structures, structureId])

  useEffect(() => {
    if (selectedStructure?.groupId) setGroupId(selectedStructure.groupId)
  }, [selectedStructure])

  useEffect(() => { setStructureId(''); setGroupId(''); setPreview(null); setResult(null) }, [termId])

  useEffect(() => {
    setPreview(null); setResult(null)
    if (!structureId || !groupId) return
    setLoadingPreview(true)
    previewBulkIssue(groupId, structureId, override)
      .then(setPreview)
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setLoadingPreview(false))
  }, [structureId, groupId, override])

  async function handleIssue() {
    setIssuing(true)
    try {
      const r = await bulkIssueInvoices(groupId, structureId, override)
      setResult(r); setPreview(null); setConfirming(false)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setIssuing(false)
    }
  }

  if (loading) return <LoadingState label="Loading fee structures..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null) }} />

  const groupName = groups.find((g) => g.id === groupId)?.name ?? ''

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.label}>Term</Text>
      {terms.map((t) => (
        <Pressable key={t.id} style={[styles.optionRow, termId === t.id && styles.optionRowActive]} onPress={() => setTermId(t.id)}>
          <Text style={styles.optionText}>{t.sessionName} · {t.name}</Text>
        </Pressable>
      ))}

      <Text style={[styles.label, { marginTop: 16 }]}>Fee Structure</Text>
      {structuresForTerm.length === 0 ? (
        <Text style={styles.hint}>No fee structures for this term yet — create one on the web app.</Text>
      ) : (
        structuresForTerm.map((s) => (
          <Pressable key={s.id} style={[styles.optionRow, structureId === s.id && styles.optionRowActive]} onPress={() => setStructureId(s.id)}>
            <Text style={styles.optionText}>{s.name} ({s.groupName})</Text>
          </Pressable>
        ))
      )}

      {selectedStructure && !selectedStructure.groupId && (
        <>
          <Text style={[styles.label, { marginTop: 16 }]}>Class</Text>
          {groups.map((g) => (
            <Pressable key={g.id} style={[styles.optionRow, groupId === g.id && styles.optionRowActive]} onPress={() => setGroupId(g.id)}>
              <Text style={styles.optionText}>{g.name}</Text>
            </Pressable>
          ))}
        </>
      )}

      {selectedStructure?.groupId && (
        <Text style={[styles.hint, { marginTop: 16 }]}>Class: {selectedStructure.groupName} (fixed by this fee structure)</Text>
      )}

      <View style={styles.overrideRow}>
        <Text style={styles.overrideLabel}>Override duplicate protection</Text>
        <Switch value={override} onValueChange={setOverride} />
      </View>

      {loadingPreview && <LoadingState label="Calculating preview..." />}

      {preview && !loadingPreview && (
        <View style={styles.previewBox}>
          <Text style={styles.previewTitle}>Preview — {groupName}</Text>
          <View style={styles.previewStats}>
            <View style={styles.previewStat}><Text style={styles.previewValue}>{preview.eligibleCount}</Text><Text style={styles.previewLabel}>Will receive</Text></View>
            <View style={styles.previewStat}><Text style={[styles.previewValue, { color: '#d97706' }]}>{preview.willSkip}</Text><Text style={styles.previewLabel}>Skipped</Text></View>
            <View style={styles.previewStat}><Text style={styles.previewValue}>₦{preview.totalValue.toLocaleString()}</Text><Text style={styles.previewLabel}>Total value</Text></View>
          </View>

          {preview.eligibleCount === 0 ? (
            <Text style={styles.hint}>No students to issue to — all already have an invoice from this structure.</Text>
          ) : confirming ? (
            <View>
              <Text style={styles.confirmText}>Issue {preview.eligibleCount} invoice(s) totaling ₦{preview.totalValue.toLocaleString()} to {groupName}?</Text>
              <View style={styles.confirmRow}>
                <Pressable style={styles.confirmButton} onPress={handleIssue} disabled={issuing}><Text style={styles.confirmButtonText}>{issuing ? 'Issuing...' : 'Confirm & Issue'}</Text></Pressable>
                <Pressable style={styles.cancelButton} onPress={() => setConfirming(false)}><Text style={styles.cancelButtonText}>Cancel</Text></Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.issueButton} onPress={() => setConfirming(true)}><Text style={styles.issueButtonText}>Issue Invoices</Text></Pressable>
          )}
        </View>
      )}

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Bulk issuance complete</Text>
          <View style={styles.previewStats}>
            <View style={styles.previewStat}><Text style={[styles.previewValue, { color: '#16a34a' }]}>{result.invoicesCreated}</Text><Text style={styles.previewLabel}>Created</Text></View>
            <View style={styles.previewStat}><Text style={[styles.previewValue, { color: '#d97706' }]}>{result.skipped}</Text><Text style={styles.previewLabel}>Skipped</Text></View>
            <View style={styles.previewStat}><Text style={[styles.previewValue, { color: '#d92d20' }]}>{result.failed}</Text><Text style={styles.previewLabel}>Failed</Text></View>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 6 },
  optionRow: { padding: 10, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, marginBottom: 6 },
  optionRowActive: { borderColor: '#1a56db', backgroundColor: '#eef2ff' },
  optionText: { fontSize: 13 },
  hint: { fontSize: 11, color: '#999' },
  overrideRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  overrideLabel: { fontSize: 12, color: '#666' },
  previewBox: { marginTop: 16, backgroundColor: '#f9fafb', borderRadius: 8, padding: 12 },
  previewTitle: { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 10 },
  previewStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  previewStat: { alignItems: 'center' },
  previewValue: { fontSize: 16, fontWeight: '700' },
  previewLabel: { fontSize: 10, color: '#999', marginTop: 2 },
  confirmText: { fontSize: 13, marginBottom: 10 },
  confirmRow: { flexDirection: 'row', gap: 8 },
  confirmButton: { backgroundColor: '#1a56db', borderRadius: 6, padding: 10, flex: 1, alignItems: 'center' },
  confirmButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  cancelButton: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, flex: 1, alignItems: 'center' },
  cancelButtonText: { fontSize: 12 },
  issueButton: { backgroundColor: '#1a56db', borderRadius: 6, padding: 10, alignItems: 'center' },
  issueButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  resultBox: { marginTop: 16, backgroundColor: '#dcfce7', borderRadius: 8, padding: 12 },
  resultTitle: { fontSize: 12, fontWeight: '700', color: '#166534', marginBottom: 10 },
})