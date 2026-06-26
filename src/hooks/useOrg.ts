import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PLAN_LIMITS, type Organization, type User, type SubscriptionPlan } from '@/types'

interface UseOrgReturn {
  user: User | null
  org: Organization | null
  plan: SubscriptionPlan
  limits: typeof PLAN_LIMITS[SubscriptionPlan]
  loading: boolean
  isAdmin: boolean
  canUseFeature: (feature: keyof typeof PLAN_LIMITS[SubscriptionPlan]) => boolean
}

export function useOrg(): UseOrgReturn {
  const supabase = createClient()
  const [user, setUser]     = useState<User | null>(null)
  const [org, setOrg]       = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('users').select('*').eq('id', authUser.id).single()

      setUser(profile)

      if (profile?.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations').select('*').eq('id', profile.organization_id).single()
        setOrg(orgData)
      }

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  const plan: SubscriptionPlan = (org?.subscription_plan as SubscriptionPlan) ?? 'free'
  const limits = PLAN_LIMITS[plan]

  return {
    user,
    org,
    plan,
    limits,
    loading,
    isAdmin: user?.role === 'admin',
    canUseFeature: (feature) => !!limits[feature],
  }
}
