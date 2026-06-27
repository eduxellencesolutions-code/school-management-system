'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function ParentPage() {
  const router = useRouter()
  const supabase = createClient()
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [student, setStudent] = useState<{
    first_name: string
    last_name: string
    admission_number: string
  } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pin || pin.length < 6) {
      toast.error('Please enter a valid PIN (6-8 digits)')
      return
    }

    setLoading(true)
    try {
      // FIX: Use learner_id directly and fetch learner separately
      const { data: pinData, error: pinError } = await supabase
        .from('learner_pins')
        .select('learner_id')
        .eq('pin', pin.trim())
        .single()

      if (pinError || !pinData) {
        toast.error('Invalid PIN. Please check and try again.')
        setLoading(false)
        return
      }

      // Fetch learner details separately
      const { data: learnerData, error: learnerError } = await supabase
        .from('learners')
        .select('first_name, last_name, admission_number')
        .eq('id', pinData.learner_id)
        .single()

      if (learnerError || !learnerData) {
        toast.error('Student not found. Please contact the school.')
        setLoading(false)
        return
      }

      setStudent(learnerData)
      toast.success(`Welcome, ${learnerData.first_name}!`)

      sessionStorage.setItem('parent_pin', pin.trim())
      sessionStorage.setItem('parent_learner_id', pinData.learner_id)

      router.push(`/parent/results/${pinData.learner_id}`)
    } catch (err) {
      console.error('Parent login error:', err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-ink">Parent Portal</h1>
          <p className="text-sm text-ink-muted mt-1">
            Enter your child's PIN to view results
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Student PIN
            </label>
            <input
              type="text"
              placeholder="e.g. 12345678"
              className="input text-center text-lg font-mono tracking-widest"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              maxLength={8}
              autoFocus
            />
            <p className="text-xs text-ink-faint mt-1">
              Enter the 6-8 digit PIN provided by your child's school
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || pin.length < 6}
            className="btn-primary btn mt-2"
          >
            {loading ? 'Verifying…' : 'View Results →'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-ink-muted hover:text-ink">
            ← Back to home
          </Link>
        </div>

        {student && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-700">
              Welcome, <strong>{student.first_name} {student.last_name}</strong>!
            </p>
            <p className="text-xs text-green-600">
              Admission: {student.admission_number}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}