'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Building, Users, UsersRound, Ticket, DollarSign, Handshake, ShieldAlert, BarChart3, Megaphone, Menu, Home, Wallet, FolderOpen, Settings } from 'lucide-react'
import LogoutButton from '@/components/super-admin/LogoutButton'
import GlobalSearch from '@/components/super-admin/GlobalSearch'
import { getVisibleNavItems, type NavAccess } from '@/lib/auth/navConfig'

const ICONS: Record<string, any> = {
  overview: LayoutDashboard,
  welcome: Home,
  schools: Building,
  'solo-teachers': Users,
  analytics: BarChart3,
  support: Ticket,
  commissions: DollarSign,
  withdrawals: Wallet,
  representatives: Handshake,
  security: ShieldAlert,
  audit: ShieldAlert,
  'platform-announcements': Megaphone,
  'platform-users': UsersRound,
  team: UsersRound,
  resources: FolderOpen,
  settings: Settings,
}

export default function SuperAdminShell({
  children,
  access,
}: {
  children: React.ReactNode
  access: NavAccess
}) {
  const router = useRouter()
  const supabase = createClient()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const moreTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const moreDropdownRef = useRef<HTMLDivElement>(null)

  const handleMoreEnter = () => {
    if (moreTimeoutRef.current) {
      clearTimeout(moreTimeoutRef.current)
      moreTimeoutRef.current = null
    }
    setIsMoreOpen(true)
  }

  const handleMoreLeave = () => {
    moreTimeoutRef.current = setTimeout(() => {
      setIsMoreOpen(false)
    }, 300)
  }

  useEffect(() => {
    return () => {
      if (moreTimeoutRef.current) {
        clearTimeout(moreTimeoutRef.current)
      }
    }
  }, [])

  const visibleItems = getVisibleNavItems(access)
  const primaryItems = visibleItems.filter(i => i.section === 'primary')
  const moreItems = visibleItems.filter(i => i.section === 'more')

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="border-b border-surface-200 bg-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-bold text-sm text-ink whitespace-nowrap">
            Eduxellence <span className="text-red-600">Admin</span>
          </span>
          <span className="text-[10px] font-medium bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
            Super Admin
          </span>
        </div>

        <div className="hidden md:block flex-1 max-w-md mx-4">
          <GlobalSearch />
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {primaryItems.map(item => {
              const Icon = ICONS[item.key] ?? LayoutDashboard
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 px-2 py-1.5 rounded hover:bg-surface-100 transition-colors whitespace-nowrap"
                >
                  <Icon size={14} /> {item.label}
                </Link>
              )
            })}

            {moreItems.length > 0 && (
              <div
                className="relative"
                ref={moreDropdownRef}
                onMouseEnter={handleMoreEnter}
                onMouseLeave={handleMoreLeave}
              >
                <button className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 px-2 py-1.5 rounded hover:bg-surface-100 transition-colors">
                  More <span className="text-[10px]">▼</span>
                </button>
                {isMoreOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-surface-200 rounded shadow-lg py-1 min-w-[140px] z-50">
                    {moreItems.map(item => {
                      const Icon = ICONS[item.key] ?? LayoutDashboard
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors"
                        >
                          <Icon size={13} /> {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Mobile Menu */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="btn-secondary btn-sm btn flex items-center gap-1"
            >
              <Menu size={16} />
            </button>
            {isMobileMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-surface-200 rounded shadow-lg py-1 min-w-[160px] z-50">
                {visibleItems.map(item => {
                  const Icon = ICONS[item.key] ?? LayoutDashboard
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors"
                    >
                      <Icon size={13} /> {item.label}
                    </Link>
                  )
                })}
                <div className="border-t border-surface-200 my-1"></div>
                <LogoutButton />
              </div>
            )}
          </div>

          {/* ✅ Desktop Logout - shrink-0 prevents it from being squeezed out */}
          <div className="hidden lg:block shrink-0">
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="md:hidden px-4 py-2 border-b border-surface-200 bg-white">
        <GlobalSearch />
      </div>

      <main className="p-6">{children}</main>
    </div>
  )
}