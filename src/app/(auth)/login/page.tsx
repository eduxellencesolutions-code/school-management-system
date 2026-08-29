'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'
import MFAChallenge from '@/components/auth/MFAChallenge'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function afterFullyAuthenticated() {
    toast.success('Welcome back!')
    await new Promise(resolve => setTimeout(resolve, 500))
    router.refresh()

    const meRes = await fetch('/api/workspaces')
    const { workspaces } = await meRes.json()

    if (!workspaces || workspaces.length === 0) {
      router.push('/dashboard')
    } else if (workspaces.length === 1) {
      router.push(workspaces[0].href)
    } else {
      router.push('/workspaces')
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      })

      if (error) {
        // ── Record failed login attempt (fire-and-forget) ──
        fetch('/api/auth/record-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email.trim(), success: false }),
        }).catch(() => {})

        if (error.message.includes('Email not confirmed')) {
          toast.error('Please confirm your email address before logging in.')
        } else {
          toast.error(error.message)
        }
        setLoading(false)
        return
      }

      // ── Record successful login attempt ──
      const { user } = await getAuthenticatedUser(supabase)
      fetch('/api/auth/record-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, success: true }),
      }).catch(() => {})

      // ── Check if this account needs a 2FA step before granting full access ──
      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      if (aalError) {
        console.error('AAL check failed:', aalError.message)
        // Fail open here (don't block login on a transient AAL check error) —
        // the super-admin layout gate still protects sensitive routes.
        await afterFullyAuthenticated()
        return
      }

      if (aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
        const { data: factorsData } = await supabase.auth.mfa.listFactors()
        const totpFactor = factorsData?.totp.find(f => f.status === 'verified')
        if (totpFactor) {
          setMfaFactorId(totpFactor.id)
          setLoading(false)
          return
        }
      }

      await afterFullyAuthenticated()
    } catch (err) {
      console.error('Login error:', err)
      toast.error('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (mfaFactorId) {
    return (
      <MFAChallenge
        factorId={mfaFactorId}
        onVerified={afterFullyAuthenticated}
      />
    )
  }

  return (
    <div className="card p-8 max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-ink mb-1">Sign in to your account</h2>
      <p className="text-sm text-ink-muted mb-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-brand-500 hover:underline font-medium">
          Create one free
        </Link>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Email</label>
          <input
            type="email"
            placeholder="you@school.com"
            className="input"
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-ink">Password</label>
            <Link href="/forgot-password" className="text-xs text-brand-500 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="input pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary btn mt-2">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}