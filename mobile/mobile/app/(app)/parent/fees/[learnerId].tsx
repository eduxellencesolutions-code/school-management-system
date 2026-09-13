import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { loadChildFees, FeeAccount } from '../../../../src/lib/supabase/queries/parentFees'
import { LoadingState, ErrorState, EmptyState, SectionCard } from '../../../../src/components/ui'

export default function ChildFees() {
  const { learnerId } = useLocalSearchParams<{ learnerId: string }>()
  const [accounts, setAccounts] = useState<FeeAccount[]>([])
  const [featureDisabled, setFeatureDisabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!learnerId) return
    loadChildFees(learnerId)
      .then((r) => { setAccounts(r.accounts); setFeatureDisabled(r.featureDisabled) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [learnerId])

  if (loading) return <LoadingState label="Loading fees..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null) }} />
  if (featureDisabled) return <EmptyState message="Fee tracking is not enabled for this school." />
  if (accounts.length === 0) return <EmptyState message="No fee records available yet." />

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {accounts.map((acc, i) => {
        const pct = acc.balance.totalCharged > 0 ? Math.min(100, Math.max(0, (acc.balance.totalPaid / acc.balance.totalCharged) * 100)) : 0
        return (
          <SectionCard key={i} title={acc.termName ?? 'Term'}>
            <View style={styles.statsRow}>
              <View style={styles.stat}><Text style={styles.statValue}>₦{acc.balance.totalCharged.toLocaleString()}</Text><Text style={styles.statLabel}>Total Fee</Text></View>
              <View style={styles.stat}><Text style={[styles.statValue, { color: '#16a34a' }]}>₦{acc.balance.totalPaid.toLocaleString()}</Text><Text style={styles.statLabel}>Paid</Text></View>
              <View style={styles.stat}><Text style={[styles.statValue, { color: acc.balance.outstanding > 0 ? '#d92d20' : '#16a34a' }]}>₦{acc.balance.outstanding.toLocaleString()}</Text><Text style={styles.statLabel}>Outstanding</Text></View>
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
            {acc.payments.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.paymentsHeader}>Payment History</Text>
                {acc.payments.map((p) => (
                  <View key={p.id} style={styles.paymentRow}>
                    <Text style={styles.paymentText}>₦{p.amount.toLocaleString()} · {p.method}</Text>
                    <Text style={styles.paymentDate}>{new Date(p.paidDate).toLocaleDateString()}{p.status === 'pending' ? ' · Awaiting confirmation' : ''}</Text>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 14, fontWeight: '700' },
  statLabel: { fontSize: 10, color: '#999', marginTop: 2 },
  progressTrack: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#1a56db' },
  paymentsHeader: { fontSize: 11, fontWeight: '600', color: '#999', marginBottom: 6 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  paymentText: { fontSize: 13 },
  paymentDate: { fontSize: 11, color: '#999' },
})