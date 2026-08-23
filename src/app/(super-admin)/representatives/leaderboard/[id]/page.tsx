// src/app/(super-admin)/representatives/leaderboard/[id]/page.tsx
import RepLeaderboardDetail from '@/components/super-admin/RepLeaderboardDetail'
export const dynamic = 'force-dynamic'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RepLeaderboardDetail representativeId={id} />
}