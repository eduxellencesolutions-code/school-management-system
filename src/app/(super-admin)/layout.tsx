'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Building, Users, UsersRound, Ticket, DollarSign, Handshake, ShieldAlert, BarChart3, Megaphone, Menu, X } from 'lucide-react'
import LogoutButton from '@/components/super-admin/LogoutButton'
import GlobalSearch from '@/components/super-admin/GlobalSearch'

interface NavLink {
  href: string
  label: string
  icon: any
  show: boolean
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const moreTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const moreDropdownRef = useRef<HTMLDivElement>(null)

  // This is a client-side version - you'll need to fetch user data in a useEffect
  // or use a server component for the initial data and pass it down
  // For simplicity, I'm assuming you have access data from the server

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

  // ... rest of your component logic
  // (You'll need to move the data fetching logic here or use a server component pattern)

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="border-b border-surface-200 bg-white px-4 py-2 flex items-center justify-between">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-bold text-sm text-ink whitespace-nowrap">
            Eduxellence <span className="text-red-600">Admin</span>
          </span>
          <span className="text-[10px] font-medium bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
            Super Admin
          </span>
        </div>

        {/* Center: Global Search */}
        <div className="hidden md:block flex-1 max-w-md mx-4">
          <GlobalSearch />
        </div>

        {/* Right: Nav + Logout */}
        <div className="flex items-center gap-2">
          {/* Desktop Nav - Primary Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link href="/overview" className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 px-2 py-1.5 rounded hover:bg-surface-100 transition-colors whitespace-nowrap">
              <LayoutDashboard size={14} /> Overview
            </Link>
            <Link href="/schools" className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 px-2 py-1.5 rounded hover:bg-surface-100 transition-colors whitespace-nowrap">
              <Building size={14} /> Schools
            </Link>
            <Link href="/solo-teachers" className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 px-2 py-1.5 rounded hover:bg-surface-100 transition-colors whitespace-nowrap">
              <Users size={14} /> Solo Teachers
            </Link>
            <Link href="/analytics" className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 px-2 py-1.5 rounded hover:bg-surface-100 transition-colors whitespace-nowrap">
              <BarChart3 size={14} /> Analytics
            </Link>
            <Link href="/support" className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 px-2 py-1.5 rounded hover:bg-surface-100 transition-colors whitespace-nowrap">
              <Ticket size={14} /> Support
            </Link>

            {/* More Dropdown */}
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
                  <Link href="/commissions" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                    <DollarSign size={13} /> Commissions
                  </Link>
                  <Link href="/representatives" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                    <Handshake size={13} /> Representatives
                  </Link>
                  <Link href="/audit" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                    <ShieldAlert size={13} /> Audit Log
                  </Link>
                  <Link href="/announcements" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                    <Megaphone size={13} /> Announcements
                  </Link>
                  <Link href="/team" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                    <UsersRound size={13} /> Team
                  </Link>
                </div>
              )}
            </div>
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
                {/* Mobile nav links */}
                <Link href="/overview" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                  <LayoutDashboard size={13} /> Overview
                </Link>
                <Link href="/schools" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                  <Building size={13} /> Schools
                </Link>
                <Link href="/solo-teachers" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                  <Users size={13} /> Solo Teachers
                </Link>
                <Link href="/analytics" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                  <BarChart3 size={13} /> Analytics
                </Link>
                <Link href="/support" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                  <Ticket size={13} /> Support
                </Link>
                <Link href="/commissions" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                  <DollarSign size={13} /> Commissions
                </Link>
                <Link href="/representatives" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                  <Handshake size={13} /> Representatives
                </Link>
                <Link href="/audit" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                  <ShieldAlert size={13} /> Audit Log
                </Link>
                <Link href="/announcements" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                  <Megaphone size={13} /> Announcements
                </Link>
                <Link href="/team" className="flex items-center gap-2 px-3 py-1.5 text-xs text-ink-muted hover:bg-surface-50 hover:text-ink transition-colors">
                  <UsersRound size={13} /> Team
                </Link>
                <div className="border-t border-surface-200 my-1"></div>
                <LogoutButton />
              </div>
            )}
          </div>

          {/* Desktop Logout */}
          <div className="hidden lg:block">
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Mobile Search */}
      <div className="md:hidden px-4 py-2 border-b border-surface-200 bg-white">
        <GlobalSearch />
      </div>

      <main className="p-6">{children}</main>
    </div>
  )
}