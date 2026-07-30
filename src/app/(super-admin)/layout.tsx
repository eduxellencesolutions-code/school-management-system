import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getStaffAccess, hasPermission } from '@/lib/auth/getStaffAccess'
import Link from 'next/link'
import { LayoutDashboard, Building, Users, UsersRound, Ticket, DollarSign, Handshake, ShieldAlert, BarChart3, Megaphone, Menu, X } from 'lucide-react'
import LogoutButton from '@/components/super-admin/LogoutButton'
import GlobalSearch from '@/components/super-admin/GlobalSearch'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const access = await getStaffAccess(supabase, user.id)
  if (!access.isSuperAdmin && !access.isStaff) redirect('/dashboard')

  const navLinks = [
    { href: '/overview', label: 'Overview', icon: LayoutDashboard, show: access.isSuperAdmin },
    { href: '/schools', label: 'Schools', icon: Building, show: access.isSuperAdmin || hasPermission(access, 'schools.view') },
    { href: '/solo-teachers', label: 'Solo Teachers', icon: Users, show: access.isSuperAdmin || hasPermission(access, 'schools.view') },
    { href: '/analytics', label: 'Analytics', icon: BarChart3, show: hasPermission(access, 'analytics.view') },
    { href: '/support', label: 'Support', icon: Ticket, show: hasPermission(access, 'support.view') },
    { href: '/commissions', label: 'Commissions', icon: DollarSign, show: hasPermission(access, 'billing.view') || hasPermission(access, 'commissions.approve') },
    { href: '/representatives', label: 'Representatives', icon: Handshake, show: hasPermission(access, 'representatives.view') },
    { href: '/audit', label: 'Audit Log', icon: ShieldAlert, show: hasPermission(access, 'security.audit') },
    { href: '/announcements', label: 'Announcements', icon: Megaphone, show: hasPermission(access, 'announcements.manage') || access.isSuperAdmin },
    { href: '/team', label: 'Team', icon: UsersRound, show: access.isSuperAdmin },
  ].filter(l => l.show)

  const primaryNav = navLinks.slice(0, 5)
  const moreNav = navLinks.slice(5)

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="border-b border-surface-200 bg-white px-4 py-2 flex items-center justify-between">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-bold text-sm text-ink whitespace-nowrap">
            Eduxellence <span className="text-red-600">Admin</span>
          </span>
          {access.isSuperAdmin && (
            <span className="text-[10px] font-medium bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
              Super Admin
            </span>
          )}
        </div>

        {/* Center: Global Search (hidden on small screens) */}
        <div className="hidden md:block flex-1 max-w-md mx-4">
          <GlobalSearch />
        </div>

        {/* Right: Nav + Logout */}
        <div className="flex items-center gap-2">
          {/* Desktop Nav - Primary Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {primaryNav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 px-2 py-1.5 rounded hover:bg-surface-100 transition-colors whitespace-nowrap"
              >
                <Icon size={14} /> {label}
              </Link>
            ))}
          </nav>

          {/* Desktop Nav - More Dropdown */}
          {moreNav.length > 0 && (
            <div className="hidden lg:block relative group">
              <button className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 px-2 py-1.5 rounded hover:bg-surface-100 transition-colors">
                More <span className="text-[10px]">▼</span>
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-surface-200 rounded shadow-lg py-1 min-w-[140px] z-50 hidden group-hover:block">
                {moreNav.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors"
                  >
                    <Icon size={13} /> {label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <div className="lg:hidden">
            <details className="dropdown">
              <summary className="btn-secondary btn-sm btn flex items-center gap-1">
                <Menu size={16} />
              </summary>
              <div className="absolute right-0 top-full mt-1 bg-white border border-surface-200 rounded shadow-lg py-1 min-w-[160px] z-50">
                {navLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors"
                  >
                    <Icon size={13} /> {label}
                  </Link>
                ))}
                <div className="border-t border-surface-200 my-1"></div>
                <LogoutButton />
              </div>
            </details>
          </div>

          {/* Desktop Logout */}
          <div className="hidden lg:block">
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Mobile Search (below header) */}
      <div className="md:hidden px-4 py-2 border-b border-surface-200 bg-white">
        <GlobalSearch />
      </div>

      <main className="p-6">{children}</main>
    </div>
  )
}