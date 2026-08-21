// src/app/(super-admin)/representatives/schools/[id]/page.tsx
import SchoolRelationshipProfile from '@/components/super-admin/SchoolRelationshipProfile'

export const dynamic = 'force-dynamic'

export default async function SchoolRelationshipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SchoolRelationshipProfile organizationId={id} />
}