'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
  'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(7, 'Enter a valid phone number').optional().or(z.literal('')),
  state: z.string().min(1, 'Select your state'),
})

type FormData = z.infer<typeof schema>

export default function ApplyRepresentativePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState<{ referralCode: string } | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch('/api/representatives/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: data.fullName.trim(),
          email: data.email.trim(),
          phone: data.phone?.trim() || undefined,
          state: data.state,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          toast.error('Please sign in first, then apply.')
          router.push('/login?redirect=/apply-representative')
          return
        }
        throw new Error(result.error || 'Application failed')
      }

      setSubmitted({ referralCode: result.referralCode })
      toast.success('Application submitted!')
    } catch (err: unknown) {
      console.error('Representative application error:', err)
      toast.error(err instanceof Error ? err.message : 'Application failed')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="card p-8 max-w-md mx-auto">
        <h2 className="text-lg font-semibold text-ink mb-1">You&apos;re in! 🎉</h2>
        <p className="text-sm text-ink-muted mb-6">
          Your representative account is ready. Share your referral link with schools and teachers to start earning commission.
        </p>

        <div className="bg-brand-50 border border-brand-200 rounded p-3 text-sm text-brand-700 mb-4">
          <p className="font-semibold mb-1">Your referral code</p>
          <p className="font-mono text-base">{submitted.referralCode}</p>
        </div>

        <div className="bg-surface-50 border border-surface-200 rounded p-3 text-xs text-ink-muted mb-6">
          Share this link:{' '}
          <span className="font-mono break-all">
            https://results.eduxellence.org/signup?ref={submitted.referralCode}
          </span>
        </div>

        <Link href="/rep" className="btn-primary btn w-full text-center">
          Go to my dashboard →
        </Link>
      </div>
    )
  }

  return (
    <div className="card p-8 max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-ink mb-1">Become a Representative</h2>
      <p className="text-sm text-ink-muted mb-6">
        Earn commission by referring schools and teachers to Eduxellence.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Full name</label>
          <input type="text" placeholder="Amara Okafor" className="input" {...register('fullName')} />
          {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Email address</label>
          <input type="email" placeholder="you@example.com" className="input" {...register('email')} />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Phone number</label>
          <input type="tel" placeholder="08012345678" className="input" {...register('phone')} />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">State</label>
          <select className="input" {...register('state')} defaultValue="">
            <option value="" disabled>Select your state</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state.message}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary btn mt-2">
          {loading ? 'Submitting…' : 'Apply now'}
        </button>
      </form>
    </div>
  )
}