// FILE: src/app/results-preview/page.tsx
import { notFound } from 'next/navigation'
import ResultsExperience from '@/components/results/ResultsExperience'
import { sampleBundle } from '@/components/results/sampleBundle'

// Development only. In production this route does not exist.
export default function ResultsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-28">
      <ResultsExperience previewBundle={sampleBundle} />
    </div>
  )
}