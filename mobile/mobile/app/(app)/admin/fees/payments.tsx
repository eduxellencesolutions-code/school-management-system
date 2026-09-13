import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, Alert } from 'react-native'
import { useAuth } from '../../../../src/lib/auth/AuthContext'
import { supabase } from '../../../../src/lib/supabase/client'
import { loadStudentLedger, recordPayment, voidPayment, StudentLedger } from '../../../../src/lib/supabase/queries/financeApi'
import { LoadingState, ErrorState, EmptyState } from '../../../../src/components/ui'
import { PromptModal } from '../../../../src/components/PromptModal'

const METHODS = ['cash', 'bank_transfer', 'card']

export default function PaymentsScreen() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [groupId, setGroupId] = useState('')
  const [learners, setLearners] = useState<{ id: string; first_name: string; last_name: string }[]>([])
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null)
  const [termId, setTermId] = useState<string | null>(null)
  const [ledger, setLedger] = useState<StudentLedger | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingLedger, setLoadingLedger] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [voidTargetId, setVoidTargetId] = useState<string | null>(null)

  useEffect(() => {
    if (!profile || profile.kind !== 'staff') return
    if (!profile.organizationId) return
    async function init() {
      const { data: org } = await supabase.from('organizations').select('current_term_id').eq('id', profile!.organizationId!).single()
      setTermId(org?.current_term_id ?? null)
      const { data: cls } = await supabase.from('groups').select('id, name').eq('organization_id', profile!.organizationId!).eq('type', 'class').eq('is_active', true).order('name')
      setClasses(cls ?? [])
      if (cls?.[0]) setGroupId(cls[0].id)
      setLoading(false)
    }
    init()
  }, [profile])

  useEffect(() => {
    if (!groupId) return
    setSelectedLearnerId(null); setLedger(null)
    supabase.from('learners').select('id, first_name, last_name').eq('group_id', groupId).eq('is_active', true).order('last_name')
      .then(({ data }) => setLearners(data ?? []))
  }, [groupId])

  async function selectLearner(learnerId: string) {
    setSelectedLearnerId(learnerId)
    if (!termId) return
    setLoadingLedger(true)
    try { setLedger(await loadStudentLedger(learnerId, termId)) }
    catch (e: any) { Alert.alert('Error', e.message) }
    finally { setLoadingLedger(false) }
  }

  async function handleRecordPayment() {
    if (!ledger?.accountId || !amount) return
    setSaving(true)
    try {
      const result = await recordPayment({ accountId: ledger.accountId, amount: Number(amount), method, reference: reference || null, paidDate: new Date().toISOString().split('T')[0] })
      if (result.warning) Alert.alert('Warning', result.warning)
      setAmount(''); setReference('')
      await selectLearner(selectedLearnerId!)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleVoid(paymentId: string) {
    setVoidTargetId(paymentId)
  }

  async function confirmVoid(reason: string) {
    if (!voidTargetId) return
    const targetId = voidTargetId
    setVoidTargetId(null)
    try {
      await voidPayment(targetId, reason)
      await selectLearner(selectedLearnerId!)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }

  // Parents/students never reach this screen — this guard satisfies the type
  // system (ParentProfile/StudentProfile have no organizationId).
  if (!profile || profile.kind !== 'staff') {
    return <ErrorState message="This screen is not available for your account type." onRetry={() => {}} />
  }

  if (loading) return <LoadingState label="Loading..." />
  if (!termId) return <ErrorState message="No current academic term is set." onRetry={() => {}} />

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.label}>Class</Text>
      <ScrollView horizontal style={{ marginBottom: 12 }}>
        {classes.map((c) => (
          <Pressable key={c.id} style={[styles.classChip, groupId === c.id && styles.classChipActive]} onPress={() => setGroupId(c.id)}>
            <Text style={[styles.classChipText, groupId === c.id && styles.classChipTextActive]}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.label}>Student</Text>
      {learners.map((l) => (
        <Pressable key={l.id} style={[styles.studentRow, selectedLearnerId === l.id && styles.studentRowActive]} onPress={() => selectLearner(l.id)}>
          <Text style={styles.studentText}>{l.last_name} {l.first_name}</Text>
        </Pressable>
      ))}

      {selectedLearnerId && loadingLedger && <LoadingState label="Loading ledger..." />}

      {selectedLearnerId && !loadingLedger && ledger && !ledger.hasAccount && (
        <EmptyState message="This student has no fee account for this term yet. Issue an invoice first." />
      )}

      {selectedLearnerId && !loadingLedger && ledger?.hasAccount && (
        <>
          <View style={styles.balanceBox}>
            <View style={styles.balanceStat}><Text style={styles.balanceValue}>₦{ledger.balance!.totalCharged.toLocaleString()}</Text><Text style={styles.balanceLabel}>Charged</Text></View>
            <View style={styles.balanceStat}><Text style={[styles.balanceValue, { color: '#16a34a' }]}>₦{ledger.balance!.totalPaid.toLocaleString()}</Text><Text style={styles.balanceLabel}>Paid</Text></View>
            <View style={styles.balanceStat}><Text style={[styles.balanceValue, { color: ledger.balance!.outstanding > 0 ? '#d92d20' : '#16a34a' }]}>₦{ledger.balance!.outstanding.toLocaleString()}</Text><Text style={styles.balanceLabel}>Outstanding</Text></View>
          </View>

          <View style={styles.paymentForm}>
            <Text style={styles.formLabel}>Record Payment</Text>
            <TextInput style={styles.input} placeholder="Amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <View style={styles.methodRow}>
              {METHODS.map((m) => (
                <Pressable key={m} style={[styles.methodChip, method === m && styles.methodChipActive]} onPress={() => setMethod(m)}>
                  <Text style={[styles.methodChipText, method === m && styles.methodChipTextActive]}>{m.replace('_', ' ')}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Reference (optional)" value={reference} onChangeText={setReference} />
            <Pressable style={[styles.recordButton, (!amount || saving) && { opacity: 0.5 }]} onPress={handleRecordPayment} disabled={!amount || saving}>
              <Text style={styles.recordButtonText}>{saving ? 'Recording...' : 'Record Payment'}</Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Payment History</Text>
          {(ledger.payments ?? []).length === 0 ? (
            <EmptyState message="No payments recorded yet." />
          ) : (
            ledger.payments!.map((p) => (
              <View key={p.id} style={[styles.paymentRow, p.voided && { opacity: 0.5 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentText}>₦{p.amount.toLocaleString()} · {p.method}</Text>
                  <Text style={styles.paymentMeta}>
                    {new Date(p.paid_date).toLocaleDateString()}{p.reference ? ` · ${p.reference}` : ''}{p.voided ? ` · VOIDED${p.void_reason ? `: ${p.void_reason}` : ''}` : ''}
                  </Text>
                </View>
                {!p.voided && <Pressable onPress={() => handleVoid(p.id)}><Text style={styles.voidText}>Void</Text></Pressable>}
              </View>
            ))
          )}
        </>
      )}

      <PromptModal
        visible={voidTargetId !== null}
        title="Void Payment"
        message="This action cannot be undone. Please provide a reason."
        placeholder="Reason for voiding this payment"
        confirmLabel="Void Payment"
        destructive
        onCancel={() => setVoidTargetId(null)}
        onConfirm={confirmVoid}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 6 },
  classChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#f0f0f0', marginRight: 6 },
  classChipActive: { backgroundColor: '#1a56db' },
  classChipText: { fontSize: 12, color: '#666' },
  classChipTextActive: { color: '#fff', fontWeight: '600' },
  studentRow: { padding: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  studentRowActive: { backgroundColor: '#eef2ff' },
  studentText: { fontSize: 13 },
  balanceBox: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginTop: 16 },
  balanceStat: { alignItems: 'center' },
  balanceValue: { fontSize: 14, fontWeight: '700' },
  balanceLabel: { fontSize: 10, color: '#999', marginTop: 2 },
  paymentForm: { marginTop: 16, backgroundColor: '#f9fafb', borderRadius: 8, padding: 12 },
  formLabel: { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, fontSize: 13, marginBottom: 8, backgroundColor: '#fff' },
  methodRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  methodChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#eee' },
  methodChipActive: { backgroundColor: '#1a56db' },
  methodChipText: { fontSize: 11, color: '#666', textTransform: 'capitalize' },
  methodChipTextActive: { color: '#fff', fontWeight: '600' },
  recordButton: { backgroundColor: '#1a56db', borderRadius: 6, padding: 12, alignItems: 'center' },
  recordButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  paymentText: { fontSize: 13 },
  paymentMeta: { fontSize: 11, color: '#999', marginTop: 2 },
  voidText: { fontSize: 12, color: '#d92d20', fontWeight: '500' },
})