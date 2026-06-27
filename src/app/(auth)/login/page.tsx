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
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      })
      if (error) {
        // ✅ Better error handling for email confirmation
        if (error.message.includes('Email not confirmed')) {
          toast.error('Please confirm your email address before logging in.')
        } else {
          toast.error(error.message)
        }
        setLoading(false)
        return
      }
      toast.success('Welcome back!')
      // Wait for session to be written before navigating
      await new Promise(resolve => setTimeout(resolve, 500))
      router.refresh()
      router.push('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      toast.error('Something went wrong. Please try again.')
      setLoading(false)
    }
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
          <input
            type="password"
            placeholder="••••••••"
            className="input"
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary btn mt-2">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}