// ─── EmptyState ──────────────────────────────────────────────────────────────
import { type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, secondaryAction, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center px-4', className)}>
      <Icon size={40} className="text-surface-200 mb-4" />
      <h3 className="font-semibold text-ink mb-1">{title}</h3>
      <p className="text-sm text-ink-muted max-w-xs mb-6">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex gap-2 flex-wrap justify-center">
          {action && (
            <Link href={action.href} className="btn-primary btn">
              {action.label}
            </Link>
          )}
          {secondaryAction && (
            <Link href={secondaryAction.href} className="btn-secondary btn">
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('animate-spin text-brand-500', className)}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ─── PageLoader ───────────────────────────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size={32} />
    </div>
  )
}

// ─── PlanGate ─────────────────────────────────────────────────────────────────
// Wraps content that requires a paid plan - shows upgrade prompt if locked
import type { SubscriptionPlan } from '@/types'
import { Lock } from 'lucide-react'

interface PlanGateProps {
  currentPlan: SubscriptionPlan
  requiredPlans: SubscriptionPlan[]
  children: React.ReactNode
  featureName: string
}

export function PlanGate({ currentPlan, requiredPlans, children, featureName }: PlanGateProps) {
  if (requiredPlans.includes(currentPlan)) {
    return <>{children}</>
  }

  return (
    <div className="relative rounded overflow-hidden">
      <div className="blur-sm pointer-events-none select-none opacity-40">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[1px]">
        <Lock size={20} className="text-ink-muted mb-2" />
        <p className="text-sm font-semibold text-ink mb-1">{featureName}</p>
        <p className="text-xs text-ink-muted mb-3 text-center max-w-[200px]">
          Upgrade to unlock this feature
        </p>
        <Link href="/settings" className="btn-primary btn-sm btn">
          View plans →
        </Link>
      </div>
    </div>
  )
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────
// Simple inline confirm — avoids browser confirm() on mobile
interface ConfirmProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  dangerous?: boolean
}

export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Confirm', dangerous = false }: ConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-modal max-w-sm w-full p-6">
        <p className="text-sm text-ink mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary btn">Cancel</button>
          <button
            onClick={onConfirm}
            className={dangerous ? 'btn-danger btn' : 'btn-primary btn'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
import { getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-11 h-11 text-sm',
  }
  return (
    <div className={cn(
      'rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center shrink-0',
      sizeClasses[size],
      className
    )}>
      {getInitials(name)}
    </div>
  )
}
