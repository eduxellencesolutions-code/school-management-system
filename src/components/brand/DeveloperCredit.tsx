import { BRAND } from '@/lib/brand'

const linkClass =
  'inline-flex min-h-[44px] items-center text-brand-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 rounded'

export default function DeveloperCredit() {
  return (
    <div className="text-center text-xs text-ink-muted">
      <p>Designed and Developed by {BRAND.developer}</p>
      <p className="mt-1 flex flex-wrap justify-center gap-x-4">
        <a href={`tel:${BRAND.phoneTel}`} className={linkClass}>Phone: {BRAND.phoneDisplay}</a>
        <a href={`mailto:${BRAND.email}`} className={linkClass}>Email: {BRAND.email}</a>
      </p>
    </div>
  )
}