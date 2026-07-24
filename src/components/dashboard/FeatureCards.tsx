'use client'

import Link from 'next/link'
import {
  CalendarCheck, Smile, ClipboardCheck, Wallet,
  Lock, TrendingUp, Users, Megaphone, Settings, ArrowRight,
} from 'lucide-react'

interface Props {
  isAdmin: boolean
  isSoloTeacher: boolean
  planFeatures: string[]
}

export default function FeatureCards({ isAdmin, isSoloTeacher, planFeatures }: Props) {
  const has = (key: string) => planFeatures.includes(key)

  if (isSoloTeacher) return null

  const cards = [
    ...(has('attendance') ? [{
      label: 'Attendance',
      description: 'Mark daily attendance for your class',
      href: '/attendance',
      icon: CalendarCheck,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    }] : []),
    ...(has('affective_psychomotor') ? [{
      label: 'Affective & Psychomotor',
      description: 'Record character and skill ratings',
      href: '/psychomotor',
      icon: Smile,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
    }] : []),
    ...(has('homework') ? [{
      label: 'Homework',
      description: 'Create assignments and track submissions',
      href: '/homework',
      icon: ClipboardCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    }] : []),
    ...(has('fees') ? [{
      label: 'Fees',
      description: 'Track fee balances per student',
      href: '/fees',
      icon: Wallet,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    }] : []),
    ...(isAdmin ? [{
      label: 'Lock Results',
      description: 'Finalize results before promotion',
      href: '/reports/lock',
      icon: Lock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    }] : []),
    ...(isAdmin && has('promotion') ? [{
      label: 'Promotion Center',
      description: 'Review and confirm student promotions',
      href: '/promotion',
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    }] : []),
    ...(isAdmin ? [{
      label: 'Parent Management',
      description: 'View and manage parent portal access',
      href: '/parents',
      icon: Users,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
    }] : []),
    ...(isAdmin ? [{
      label: 'Announcements',
      description: 'Post school-wide updates to parents',
      href: '/announcements',
      icon: Megaphone,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    }] : []),
    ...(isAdmin && has('promotion') ? [{
      label: 'Promotion Rules',
      description: 'Set criteria for promotion recommendations',
      href: '/promotion/rules',
      icon: Settings,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
    }] : []),
  ]

  if (cards.length === 0) return null

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-sm text-ink">Manage Your School</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {cards.map(({ label, description, href, icon: Icon, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-3 p-3 rounded border border-surface-200 hover:border-brand-300 hover:bg-brand-50/30 transition-colors group"
          >
            <div className={`w-8 h-8 rounded ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={16} className={color} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink group-hover:text-brand-700 transition-colors">{label}</p>
              <p className="text-xs text-ink-faint mt-0.5">{description}</p>
            </div>
            <ArrowRight size={13} className="text-ink-faint group-hover:text-brand-500 transition-colors mt-1 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}