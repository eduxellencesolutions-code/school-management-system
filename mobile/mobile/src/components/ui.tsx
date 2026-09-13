import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { ReactNode } from 'react'

export function StatCard({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sublabel && <Text style={styles.statSublabel}>{sublabel}</Text>}
    </View>
  )
}

export function SectionCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  )
}

export function NavCard({
  label,
  onPress,
  comingSoon,
  hint,
}: {
  label: string
  onPress?: () => void
  comingSoon?: boolean
  hint?: string
}) {
  return (
    <Pressable
      style={[styles.navCard, comingSoon && styles.navCardDisabled]}
      onPress={comingSoon ? undefined : onPress}
      disabled={comingSoon}
    >
      <Text style={[styles.navCardText, comingSoon && styles.navCardTextDisabled]}>{label}</Text>
      {comingSoon && <Text style={styles.comingSoonTag}>Coming soon</Text>}
      {!comingSoon && hint && <Text style={styles.hintTag}>{hint}</Text>}
    </Pressable>
  )
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#1a56db" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{message}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </Pressable>
    </View>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  statCard: {
    flexBasis: '48%', backgroundColor: '#f5f7fa', borderRadius: 12, padding: 16, marginBottom: 12,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  statLabel: { fontSize: 13, color: '#666', marginTop: 4 },
  statSublabel: { fontSize: 11, color: '#999', marginTop: 2 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  navCard: {
    flexBasis: '48%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, padding: 14, marginBottom: 10,
  },
  navCardDisabled: { backgroundColor: '#fafafa' },
  navCardText: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  navCardTextDisabled: { color: '#aaa' },
  comingSoonTag: { fontSize: 10, color: '#aaa', marginTop: 4 },
  hintTag: { fontSize: 10, color: '#1a56db', marginTop: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#666' },
  errorText: { color: '#d92d20', textAlign: 'center', marginBottom: 16, fontSize: 14 },
  retryButton: { backgroundColor: '#1a56db', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  emptyBox: { padding: 16, backgroundColor: '#f9fafb', borderRadius: 8, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 13 },
})