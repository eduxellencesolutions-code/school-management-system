// src/app/rep/schools/[id]/page.tsx
import SchoolProfilePanel from '@/components/representatives/SchoolProfilePanel'

export const dynamic = 'force-dynamic'

export default async function RepSchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SchoolProfilePanel organizationId={id} />
}