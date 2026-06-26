'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { register, handleSubmit } = useForm<{ email: string }>()

  async function onSubmit({ email }: { email: string }) {
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="card p-8">
      {sent ? (
        <div className="text-center">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-lg font-semibold text-ink mb-2">Check your email</h2>
          <p className="text-sm text-ink-muted mb-6">
            We sent a password reset link. It expires in 1 hour.
          </p>
          <Link href="/login" className="btn-secondary btn">Back to sign in</Link>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-ink mb-1">Reset your password</h2>
          <p className="text-sm text-ink-muted mb-6">
            Enter your email and we'll send a reset link.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <input type="email" placeholder="you@school.com" className="input" {...register('email', { required: true })} />
            <button type="submit" disabled={loading} className="btn-primary btn">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <Link href="/login" className="text-center text-sm text-ink-muted hover:text-ink">
              ← Back to sign in
            </Link>
          </form>
        </>
      )}
    </div>
  )
}
