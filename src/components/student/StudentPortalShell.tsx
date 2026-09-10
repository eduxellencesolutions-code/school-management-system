// FILE: src/components/student/StudentPortalShell.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, GraduationCap, LogOut } from 'lucide-react'

// Foundation for the future portal — intentionally NOT linking areas
// that don't exist yet (Course Registration, Transcript Request, Fees).
// Building a nav item for a page with nothing behind it is exactly the
// "fake UI for systems that don't exist" you told me not to do.
// Uncomment each once its backend actually exists.
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/student', icon: LayoutDashboard },
  { label: 'Results & GPA', href: '/student/results', icon: GraduationCap },
  // { label: 'Course Registration', href: '/student/registration', icon: BookOpen },
  // { label: 'Transcript Request', href: '/student/transcript', icon: FileText },
  // { label: 'Fees', href: '/student/fees', icon: Wallet },
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
    <aside className="flex flex-col w-56 shrink-0 border-r border-surface-200 bg-white h-screen sticky top-0">
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
  )
}