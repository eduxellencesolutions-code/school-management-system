// FILE: src/app/(dashboard)/tertiary/students/[learnerId]/results/page.tsx
import ResultsExperience from '@/components/results/ResultsExperience'

export default async function StaffStudentResultsPage({ params }: { params: Promise<{ learnerId: string }> }) {
  const { learnerId } = await params
  return (
    <div>
      <p className="text-xs text-ink-muted mb-3">You are viewing this student&apos;s published results exactly as the student sees them.</p>
      <ResultsExperience learnerId={learnerId} />
    </div>
  )
}