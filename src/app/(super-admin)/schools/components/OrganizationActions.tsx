'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  activateOrganization,
  deactivateOrganization,
  suspendOrganization,
  reactivateOrExtendOrganization,
  setSubscriptionExpiry,
} from '../actions'

interface Props {
  orgId: string
  currentStatus: string
  currentExpiry?: string
}

export default function OrganizationActions({ orgId, currentStatus, currentExpiry }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const runAction = (action: (formData: FormData) => Promise<{ success: boolean; error?: string }>, label: string) => {
    const formData = new FormData()
    formData.append('org_id', orgId)
    
    startTransition(async () => {
      const result = await action(formData)
      if (result.success) {
        toast.success(`${label} successful!`)
        router.refresh()
      } else {
        toast.error(result.error || `${label} failed`)
      }
    })
  }

  const runSuspend = () => {
    const reason = prompt('Reason for suspension (optional):')
    if (reason === null) return // User cancelled
    
    const formData = new FormData()
    formData.append('org_id', orgId)
    if (reason.trim()) {
      formData.append('reason', reason.trim())
    }
    
    startTransition(async () => {
      const result = await suspendOrganization(formData)
      if (result.success) {
        toast.success('Suspended successfully!')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to suspend')
      }
    })
  }

  const runReactivate = () => {
    const expiry = prompt('New expiry date (YYYY-MM-DD):', currentExpiry?.split('T')[0] || '')
    if (expiry === null) return // User cancelled
    
    const formData = new FormData()
    formData.append('org_id', orgId)
    formData.append('subscription_end', expiry)
    
    startTransition(async () => {
      const result = await reactivateOrExtendOrganization(formData)
      if (result.success) {
        toast.success('Reactivated successfully!')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to reactivate')
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus !== 'active' && (
        <button
          onClick={() => runAction(activateOrganization, 'Activation')}
          disabled={pending}
          className="btn-primary btn-sm btn disabled:opacity-50"
        >
          Activate
        </button>
      )}

      {currentStatus !== 'suspended' && (
        <button
          onClick={runSuspend}
          disabled={pending}
          className="btn-warning btn-sm btn disabled:opacity-50"
        >
          Suspend
        </button>
      )}

      {currentStatus !== 'cancelled' && (
        <button
          onClick={() => runAction(deactivateOrganization, 'Deactivation')}
          disabled={pending}
          className="btn-danger btn-sm btn disabled:opacity-50"
        >
          Deactivate
        </button>
      )}

      {currentStatus === 'suspended' || currentStatus === 'cancelled' ? (
        <button
          onClick={runReactivate}
          disabled={pending}
          className="btn-success btn-sm btn disabled:opacity-50"
        >
          Reactivate & Extend
        </button>
      ) : null}
    </div>
  )
}