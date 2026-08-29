import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getStaffAccess } from '@/lib/auth/getStaffAccess'
import { NAV_ITEMS } from '@/lib/auth/navConfig'
import Link from 'next/link'
import { ShieldCheck, ArrowRight } from 'lucide-react'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export const dynamic = 'force-dynamic'

export default async function WelcomePage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const access = await getStaffAccess(supabase, user.id)
  const visibleItems = NAV_ITEMS.filter(item =>
    access.isSuperAdmin ||
    (item.superAdminOnly ? false : !item.requiredPermission || access.permissions.has(item.requiredPermission))
  )

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="card p-8 flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center">
          <ShieldCheck size={26} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink">Welcome, {user.email}</h1>
          <p className="text-sm text-ink-muted mt-1">
            Signed in as <strong>{access.isSuperAdmin ? 'Super Admin' : (access.roleName ?? 'Platform Staff')}</strong>
          </p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-sm text-ink mb-3">Your permissions</h2>
        {access.isSuperAdmin ? (
          <p className="text-sm text-ink-muted">Super Admin has full, unrestricted access to every module.</p>
        ) : access.permissions.size > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {Array.from(access.permissions).map(p => (
              <li key={p} className="text-xs px-2 py-1 rounded-full bg-surface-100 text-ink-muted font-mono">
                {p}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">No permissions have been assigned to this role yet.</p>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-sm text-ink mb-3">Where you can go</h2>
        <div className="flex flex-col divide-y divide-surface-100">
          {visibleItems.map(item => (
            <Link
              key={item.key}
              href={item.href}
              className="py-2.5 flex items-center justify-between text-sm text-ink hover:text-brand-600 transition-colors"
            >
              {item.label}
              <ArrowRight size={14} className="text-ink-faint" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}