'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  name:          z.string().min(2, 'Enter your full name'),
  email:         z.string().email('Enter a valid email'),
  password:      z.string().min(8, 'Password must be at least 8 characters'),
  account_type:  z.enum(['individual', 'organization']),
  org_name:      z.string().optional(),
  org_type:      z.enum(['school', 'university', 'centre']).optional(),
})
type FormData = z.infer<typeof schema>

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  // ✅ FIX: Add 'trigger' to destructure
  const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { account_type: 'individual' },
  })

  const accountType = watch('account_type')

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      // FIX: Validate required fields before proceeding
      if (!data.email || !data.password) {
        throw new Error('Email and password are required')
      }

      // ✅ FIX: Use emailRedirectTo instead of redirectTo (Supabase v2+)
      const redirectUrl = new URL('/dashboard', window.location.origin).toString()

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          data: { 
            name: data.name?.trim() || '',
            role: data.account_type === 'organization' ? 'admin' : 'teacher' 
          },
          // ✅ FIX: Use emailRedirectTo (not redirectTo)
          emailRedirectTo: redirectUrl,
        },
      })
      if (authError) {
        console.error('Auth error:', authError)
        throw new Error(authError.message || 'Authentication failed')
      }
      if (!authData.user) throw new Error('Signup failed')

      // 2. If organization, create org record
      if (data.account_type === 'organization' && data.org_name) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: data.org_name.trim(),
            type: data.org_type ?? 'school',
            subscription_plan: 'free',
            subscription_status: 'active',
          })
          .select()
          .single()
        if (orgError) {
          console.error('Org creation error:', orgError)
          throw new Error('Failed to create organization: ' + orgError.message)
        }

        // Link user to org
        const { error: updateError } = await supabase
          .from('users')
          .update({ organization_id: org.id, role: 'admin' })
          .eq('id', authData.user.id)
        
        if (updateError) {
          console.error('User update error:', updateError)
          // Don't throw - user is created, just log
        }

        // Seed default grading system
        try {
          const { error: gradeError } = await supabase.from('grading_systems').insert(
            DEFAULT_GRADES.map(g => ({
              ...g, organization_id: org.id,
            }))
          )
          if (gradeError) console.warn('Grading system seed failed:', gradeError)
        } catch (gradeErr) {
          console.warn('Grading seed error:', gradeErr)
        }
      }

      toast.success('Account created! Please check your email to confirm.')
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
        {step === 1 && (
          <>
            {/* Account type */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">I am signing up as</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'individual', label: '👤 Individual Teacher' },
                  { value: 'organization', label: '🏫 School / Institution' },
                ].map((opt) => (
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

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Password</label>
              <input type="password" placeholder="At least 8 characters" className="input" {...register('password')} />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {accountType === 'organization' ? (
              // ✅ FIX: Validate step 1 fields before moving to step 2
              <button 
                type="button" 
                onClick={async () => {
                  const valid = await trigger(['name', 'email', 'password', 'account_type'])
                  if (valid) setStep(2)
                }} 
                className="btn-primary btn mt-2"
              >
                Next: Set up your school →
              </button>
            ) : (
              <button type="submit" disabled={loading} className="btn-primary btn mt-2">
                {loading ? 'Creating account…' : 'Create free account'}
              </button>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={() => setStep(1)} className="text-ink-muted hover:text-ink text-sm">
                ← Back
              </button>
              <span className="text-sm text-ink-muted">School details</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">School / Institution name</label>
              <input type="text" placeholder="Greenfield Academy" className="input" {...register('org_name')} />
              {errors.org_name && <p className="text-xs text-red-500 mt-1">{errors.org_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Type</label>
              <select className="input" {...register('org_type')}>
                <option value="school">School (Nursery / Primary / Secondary)</option>
                <option value="university">University / Polytechnic / College</option>
                <option value="centre">Tutorial Centre / Training Institute</option>
              </select>
            </div>

            <div className="bg-surface-50 border border-surface-200 rounded p-3 text-xs text-ink-muted">
              Your school starts on the <strong>Free plan</strong> — 1 class, 30 students, Excel export.
              You can upgrade anytime from Settings.
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn mt-2">
              {loading ? 'Creating account…' : 'Create school account'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}

const DEFAULT_GRADES = [
  { name: 'Default', grade_letter: 'A', min_score: 70, max_score: 100, remark: 'Excellent',  points: 4.0 },
  { name: 'Default', grade_letter: 'B', min_score: 60, max_score: 69,  remark: 'Very Good',  points: 3.0 },
  { name: 'Default', grade_letter: 'C', min_score: 50, max_score: 59,  remark: 'Good',       points: 2.0 },
  { name: 'Default', grade_letter: 'D', min_score: 40, max_score: 49,  remark: 'Pass',       points: 1.0 },
  { name: 'Default', grade_letter: 'E', min_score: 30, max_score: 39,  remark: 'Below Pass', points: 0.5 },
  { name: 'Default', grade_letter: 'F', min_score: 0,  max_score: 29,  remark: 'Fail',       points: 0.0 },
]