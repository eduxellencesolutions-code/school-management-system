'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import DeveloperCredit from './DeveloperCredit'

// Public marketing routes only. Dashboards, portals and tools never match.
const PUBLIC_PREFIXES = [
  '/help',
  '/pricing',
  '/representative-program',
  '/founding-institutions',
  '/founding-500',
]

export default function SiteFooter() {
  const pathname = usePathname() ?? ''
  const show =
    pathname === '/' ||
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (!show) return null

  return (
    <footer className="border-t border-surface-200 bg-white px-6 py-8 print:hidden">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-5">
        <div className="text-center">
          <div className="font-semibold text-ink">
            Eduxellence <span className="text-brand-500">Results</span>
          </div>
          <p className="text-xs text-ink-faint mt-1">
            © {new Date().getFullYear()} Eduxellence. The academic operating system for modern education institutions.
          </p>
        </div>
        <Link href="/help" className="inline-flex min-h-[44px] items-center text-sm text-ink-muted hover:text-ink">
          Help Centre
        </Link>
        <div className="w-full border-t border-surface-200 pt-4">
          <DeveloperCredit />
        </div>
      </div>
    </footer>
  )
}