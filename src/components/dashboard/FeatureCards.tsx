'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarCheck, Smile, ClipboardCheck, Wallet,
  Lock, TrendingUp, Users, Megaphone, Settings, ArrowRight, Sparkles,
} from 'lucide-react'
import { INSTITUTION_PLAN_LABELS, InstitutionPlanKey } from '@/lib/plans/institutionTiers'

interface Props {
  isAdmin: boolean
  isSoloTeacher: boolean
  planFeatures: string[]
  currentPlanKey: string
  requiredPlanMap: Record<string, InstitutionPlanKey | null>
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  small_school: 'Small School',
  standard_school: 'Standard School',
  premium_school: 'Premium',
  founding_500: 'Founding 500 Promo',
}

export default function FeatureCards({ isAdmin, isSoloTeacher, planFeatures, currentPlanKey, requiredPlanMap }: Props) {
  const router = useRouter()
  const [lockedFeature, setLockedFeature] = useState<{ label: string; requiredPlan: string } | null>(null)

  const has = (key: string) => planFeatures.includes(key)

  if (isSoloTeacher) return null

  const allCards = [
    {
      key: 'basic_attendance',
      label: 'Attendance',
      description: 'Mark daily attendance for your class',
      href: '/attendance',
      icon: CalendarCheck,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      adminOnly: false,
    },
    {
      key: 'affective_psychomotor',
      label: 'Affective & Psychomotor',
      description: 'Record character and skill ratings',
      href: '/psychomotor',
      icon: Smile,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
      adminOnly: false,
    },
    {
      key: 'homework',
      label: 'Homework',
      description: 'Create assignments and track submissions',
      href: '/homework',
      icon: ClipboardCheck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      adminOnly: false,
    },
    {
      key: 'fees',
      label: 'Fees',
      description: 'Track fee balances per student',
      href: '/fees',
      icon: Wallet,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      adminOnly: false,
    },
    {
      key: 'lock_results',
      label: 'Lock Results',
      description: 'Finalize results before promotion',
      href: '/reports/lock',
      icon: Lock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      adminOnly: true,
    },
    {
      key: 'promotion_wizard',
      label: 'Promotion Center',
      description: 'Review and confirm student promotions',
      href: '/promotion',
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      adminOnly: true,
    },
    {
      key: 'parent_management',
      label: 'Parent Management',
      description: 'View and manage parent portal access',
      href: '/parents',
      icon: Users,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
      adminOnly: true,
    },
    {
      key: 'announcements',
      label: 'Announcements',
      description: 'Post school-wide updates to parents',
      href: '/announcements',
      icon: Megaphone,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      adminOnly: true,
    },
    {
      key: 'promotion_wizard',
      label: 'Promotion Rules',
      description: 'Set criteria for promotion recommendations',
      href: '/promotion/rules',
      icon: Settings,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
      adminOnly: true,
    },
  ]

  const visibleCards = allCards.filter((c) => !c.adminOnly || isAdmin)

  if (visibleCards.length === 0) return null

  const ROLE_GATED_NOT_PLAN_GATED = ['lock_results', 'parent_management', 'announcements']

  function isUnlocked(card: typeof allCards[number]): boolean {
    if (ROLE_GATED_NOT_PLAN_GATED.includes(card.key)) return true
    return has(card.key)
  }

  function requiredPlanLabel(card: typeof allCards[number]): string {
    const tier = requiredPlanMap[card.key]
    return tier ? INSTITUTION_PLAN_LABELS[tier] : 'a higher plan'
  }

  function handleClick(card: typeof allCards[number]) {
    if (isUnlocked(card)) {
      router.push(card.href)
    } else {
      setLockedFeature({ label: card.label, requiredPlan: requiredPlanLabel(card) })
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-sm text-ink">Manage Your School</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4">
          {visibleCards.map((card) => {
            const unlocked = isUnlocked(card)
            const Icon = card.icon

            return (
              <button
                key={card.href}
                onClick={() => handleClick(card)}
                className={`flex items-start gap-3 p-3 rounded border text-left transition-colors group ${
                  unlocked
                    ? 'border-surface-200 hover:border-brand-300 hover:bg-brand-50/30'
                    : 'border-surface-200 bg-surface-50/50 hover:border-amber-300'
                }`}
              >
                <div className={`w-8 h-8 rounded ${unlocked ? card.bg : 'bg-surface-100'} flex items-center justify-center flex-shrink-0`}>
                  {unlocked ? <Icon size={16} className={card.color} /> : <Lock size={14} className="text-ink-faint" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className={`text-sm font-medium transition-colors ${unlocked ? 'text-ink group-hover:text-brand-700' : 'text-ink-faint'}`}>
                      {card.label}
                    </p>
                    {!unlocked && (
                      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                        {requiredPlanLabel(card)}
                      </span>
                    )}
                    {unlocked && currentPlanKey === 'founding_500' && (
                      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                        Included with Founding 500
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-faint mt-0.5">{card.description}</p>
                </div>
                {unlocked ? (
                  <ArrowRight size={13} className="text-ink-faint group-hover:text-brand-500 transition-colors mt-1 flex-shrink-0" />
                ) : (
                  <Sparkles size={13} className="text-amber-400 mt-1 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {lockedFeature && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setLockedFeature(null)}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-3">
              <Sparkles size={18} className="text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-ink mb-1">This feature is available on the {lockedFeature.requiredPlan} plan</h3>
            <p className="text-sm text-ink-muted mb-4">
              You're currently on the <strong>{PLAN_LABELS[currentPlanKey] ?? currentPlanKey}</strong> plan. Upgrade your subscription to unlock {lockedFeature.label.toLowerCase()}.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setLockedFeature(null)} className="btn-secondary btn-sm btn flex-1">
                Maybe later
              </button>
              <button onClick={() => router.push('/settings#billing')} className="btn-primary btn-sm btn flex-1">
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}