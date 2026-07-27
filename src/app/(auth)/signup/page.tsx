'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'  // ← ADDITION 1: Added import
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

const schema = z.object({
  name:         z.string().min(2, 'Enter your full name'),
  email:        z.string().email('Enter a valid email'),
  password:     z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
  account_type: z.enum(['individual', 'organization']),
  org_name:     z.string().optional(),
  org_type:     z.enum(['school', 'university', 'centre']).optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine(data => {
  if (data.account_type === 'organization' && !data.org_name?.trim()) {
    return false
  }
  return true
}, {
  message: 'School name is required',
  path: ['org_name'],
})

type FormData = z.infer<typeof schema>

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()  // ← ADDITION 2: Added searchParams
  const referralCode = searchParams.get('ref')  // ← ADDITION 2: Get referral code from URL
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { account_type: 'individual', org_type: 'school' },
  })

  const accountType = watch('account_type')
  const password = watch('password')
  const confirmPassword = watch('confirmPassword')

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const supabase = createClient()

      const metadata: Record<string, string> = {
        name: data.name.trim(),
        role: data.account_type === 'organization' ? 'admin' : 'teacher',
      }

      if (data.account_type === 'organization' && data.org_name) {
        metadata.organization_name = data.org_name.trim()
        metadata.organization_type = data.org_type ?? 'school'
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: { data: metadata },
      })

      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('Signup failed — please try again')

      // ← ADDITION 3: Record referral BEFORE the confirm email check
      if (referralCode) {
        await fetch('/api/representatives/record-referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode, userId: authData.user.id }),
        }).catch(() => {}) // non-fatal — never block signup on this
      }

      if (authData.session === null && authData.user.identities?.length === 0) {
        toast.error('An account with this email already exists.')
        return
      }

      if (authData.session === null) {
        toast.success('Account created! Check your email to confirm before logging in.')
        router.push('/login?msg=confirm_email')
        return
      }

      toast.success(
        data.account_type === 'organization'
          ? `Welcome! Your school "${data.org_name}" has been set up.`
          : 'Account created! Welcome to Eduxellence.'
      )
      router.push('/dashboard')

    } catch (err: unknown) {
      console.error('Signup error:', err)
      toast.error(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-8 max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-ink mb-1">Create your free account</h2>
      <p className="text-sm text-ink-muted mb-6">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-500 hover:underline font-medium">Sign in</Link>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">I am signing up as</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'individual',   label: '👤 Individual Teacher' },
                  { value: 'organization', label: '🏫 School / Institution' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center justify-center gap-2 p-3 border rounded cursor-pointer text-sm font-medium transition-colors
                      ${accountType === opt.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-surface-200 text-ink-muted hover:border-brand-300'
                      }`}
                  >
                    <input type="radio" value={opt.value} {...register('account_type')} className="sr-only" />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Full name</label>
              <input type="text" placeholder="Amara Okafor" className="input" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Email address</label>
              <input type="email" placeholder="you@school.com" className="input" {...register('email')} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* ✅ Password with Eye Toggle */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
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

            {/* ✅ Confirm Password with Eye Toggle */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  className="input pr-10"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
              {password && confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-500 mt-1">✓ Passwords match</p>
              )}
            </div>

            {accountType === 'organization' ? (
              <button
                type="button"
                onClick={async () => {
                  const valid = await trigger(['name', 'email', 'password', 'confirmPassword', 'account_type'])
                  if (valid) setStep(2)
                }}
                className="btn-primary btn mt-2"
              >
                Next: Set up your school →
              </button>
            ) : (
              <>
                <div className="bg-surface-50 border border-surface-200 rounded p-3 text-xs text-ink-muted">
                  Individual teachers get <strong>1 class, up to 30 students</strong>, and Excel/CSV exports free.
                </div>
                <button type="submit" disabled={loading} className="btn-primary btn mt-2">
                  {loading ? 'Creating account…' : 'Create free account'}
                </button>
              </>
            )}
          </>
        )}

        {/* ── STEP 2: INSTITUTION DETAILS ── */}
        {step === 2 && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={() => setStep(1)} className="text-ink-muted hover:text-ink text-sm">
                ← Back
              </button>
              <span className="text-sm font-medium text-ink">School details</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">School / Institution name *</label>
              <input
                type="text"
                placeholder="Greenfield Academy"
                className="input"
                {...register('org_name')}
              />
              {errors.org_name && <p className="text-xs text-red-500 mt-1">{errors.org_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Institution type</label>
              <select className="input" {...register('org_type')}>
                <option value="school">School (Nursery / Primary / Secondary)</option>
                <option value="university">University / Polytechnic / College</option>
                <option value="centre">Tutorial Centre / Training Institute</option>
              </select>
            </div>

            <div className="bg-brand-50 border border-brand-200 rounded p-3 text-xs text-brand-700">
              <p className="font-semibold mb-1">What you get as admin:</p>
              <ul className="flex flex-col gap-0.5 list-disc list-inside">
                <li>Create and manage all classes</li>
                <li>Invite teachers to your school</li>
                <li>Set school logo, motto & signatures</li>
                <li>Generate branded PDF report cards</li>
                <li>View all scores and reports</li>
              </ul>
            </div>

            <div className="bg-surface-50 border border-surface-200 rounded p-3 text-xs text-ink-muted">
              Starts on <strong>Small School plan</strong>. Upgrade anytime from Settings.
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn mt-2">
              {loading ? 'Setting up your school…' : 'Create school account'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}