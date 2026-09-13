import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Image, StyleSheet } from 'react-native'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import { loadSchoolProfile, SchoolProfile } from '../../../src/lib/supabase/queries/schoolProfile'
import { LoadingState, ErrorState, SectionCard } from '../../../src/components/ui'

export default function SchoolProfileScreen() {
  const { profile } = useAuth()
  const [school, setSchool] = useState<SchoolProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.organizationId) return
    loadSchoolProfile(profile.organizationId)
      .then(setSchool)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [profile?.organizationId])

  if (loading) return <LoadingState label="Loading school profile..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null) }} />
  if (!school) return null

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {school.logoUrl && <Image source={{ uri: school.logoUrl }} style={styles.logo} resizeMode="contain" />}
      <Text style={styles.name}>{school.name}</Text>
      {school.motto && <Text style={styles.motto}>"{school.motto}"</Text>}

      <SectionCard title="Contact Information">
        {school.address && <Text style={styles.line}>{school.address}</Text>}
        {school.phone && <Text style={styles.line}>{school.phone}</Text>}
        {school.email && <Text style={styles.line}>{school.email}</Text>}
        {school.website && <Text style={styles.line}>{school.website}</Text>}
        {!school.address && !school.phone && !school.email && !school.website && (
          <Text style={styles.empty}>No contact information set yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Leadership">
        {school.principalName ? (
          <Text style={styles.line}>{school.principalName} — {school.principalTitle ?? 'Principal'}</Text>
        ) : (
          <Text style={styles.empty}>Not set yet.</Text>
        )}
        {school.establishedYear && <Text style={styles.line}>Established {school.establishedYear}</Text>}
      </SectionCard>

      <SectionCard title="Subscription">
        <Text style={styles.line}>Plan: {school.subscriptionPlan ?? 'Not set'}</Text>
        <Text style={styles.line}>Status: {school.subscriptionStatus ?? 'Unknown'}</Text>
      </SectionCard>

      <Text style={styles.editNote}>
        To edit your school's profile, branding, and signatures, use the web app under Settings → Institution Settings.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  logo: { width: 80, height: 80, alignSelf: 'center', marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  motto: { fontSize: 13, color: '#666', textAlign: 'center', fontStyle: 'italic', marginTop: 4, marginBottom: 20 },
  line: { fontSize: 14, color: '#333', marginBottom: 6 },
  empty: { fontSize: 13, color: '#999' },
  editNote: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 20, paddingHorizontal: 20 },
})