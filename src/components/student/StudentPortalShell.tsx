// FILE: src/components/student/StudentPortalShell.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FileText, GraduationCap, LogOut } from 'lucide-react'

// Only areas that actually exist are linked.
const NAV_ITEMS = [
  { label: 'My results', href: '/student', icon: GraduationCap },
  { label: 'Transcripts', href: '/student/transcripts', icon: FileText },
]

export default function StudentPortalShell() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="md:hidden shrink-0 flex items-center justify-between px-4 py-3 border-b border-surface-200 bg-white">
        <span className="font-bold text-sm text-ink">
          Eduxellence <span className="text-brand-500">Student</span>
        </span>
        <button onClick={signOut} className="flex items-center gap-1.5 text-xs font-medium text-ink-muted px-2 py-1.5 rounded hover:bg-surface-100">
          <LogOut size={13} /> Sign out
        </button>
      </header>

      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-surface-200 bg-white h-screen sticky top-0">
        <div className="px-4 py-4 border-b border-surface-200">
          <span className="font-bold text-sm text-ink">
            Eduxellence <span className="text-brand-500">Student Portal</span>
          </span>
        </div>

        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  active ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-surface-50 hover:text-ink'
                }`}
              >
                <Icon size={15} className="shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-surface-200 p-3">
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium text-ink-muted hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}