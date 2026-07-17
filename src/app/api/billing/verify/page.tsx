import { Suspense } from 'react'
import VerifyContent from './VerifyContent'

export const dynamic = 'force-dynamic'

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="animate-pulse text-ink-muted">Loading...</div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
