'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const schema = z.object({
  first_name:       z.string().min(1, 'Required'),
  last_name:        z.string().min(1, 'Required'),
  other_names:      z.string().optional(),
  admission_number: z.string().optional(),
  gender:           z.enum(['M', 'F', 'Other']).optional(),
  date_of_birth:    z.string().optional(),
  guardian_name:    z.string().optional(),
  guardian_phone:   z.string().optional(),
  email:            z.string().email().optional().or(z.literal('')),
  group_id:         z.string().min(1, 'Required'),
  is_active:        z.boolean(),
})
type FormData = z.infer<typeof schema>

interface Learner {
  id: string
  first_name: string
  last_name: string
  other_names?: string
  admission_number?: string
  gender?: string
  date_of_birth?: string
  guardian_name?: string
  guardian_phone?: string
  email?: string
  group_id: string
  is_active: boolean
}

interface Props {
  learner: Learner
  groups: { id: string; name: string }[]
}

export default function StudentEditForm({ learner, groups }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name:       learner.first_name,
      last_name:        learner.last_name,
      other_names:      learner.other_names ?? '',
      admission_number: learner.admission_number ?? '',
      gender:           (learner.gender as 'M' | 'F' | 'Other') ?? undefined,
      date_of_birth:    learner.date_of_birth ?? '',
      guardian_name:    learner.guardian_name ?? '',
      guardian_phone:   learner.guardian_phone ?? '',
      email:            learner.email ?? '',
      group_id:         learner.group_id,
      is_active:        learner.is_active,
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const { error } = await supabase
      .from('learners')
      .update({
        first_name:       data.first_name,
        last_name:        data.last_name,
        other_names:      data.other_names || null,
        admission_number: data.admission_number || null,
        gender:           data.gender || null,
        date_of_birth:    data.date_of_birth || null,
        guardian_name:    data.guardian_name || null,
        guardian_phone:   data.guardian_phone || null,
        email:            data.email || null,
        group_id:         data.group_id,
        is_active:        data.is_active,
      })
      .eq('id', learner.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Student updated')
      setEditing(false)
      router.refresh()
    }
    setLoading(false)
  }

  function cancelEdit() {
    reset()
    setEditing(false)
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="font-semibold text-sm text-ink">Student details</h2>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-secondary btn-sm btn">
            Edit
          </button>
        )}
      </div>

      <div className="card-body">
        {editing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Last name *</label>
                <input className="input" {...register('last_name')} />
                {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">First name *</label>
                <input className="input" {...register('first_name')} />
                {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Other names</label>
              <input className="input" {...register('other_names')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Admission no.</label>
                <input className="input font-mono" {...register('admission_number')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Gender</label>
                <select className="input" {...register('gender')}>
                  <option value="">Not specified</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Date of birth</label>
                <input type="date" className="input" {...register('date_of_birth')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Class</label>
                <select className="input" {...register('group_id')}>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Guardian name</label>
                <input className="input" {...register('guardian_name')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Guardian phone</label>
                <input type="tel" className="input" {...register('guardian_phone')} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Email</label>
              <input type="email" className="input" {...register('email')} />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" {...register('is_active')} className="rounded" />
              <label htmlFor="is_active" className="text-sm text-ink">Active student</label>
            </div>

            <div className="flex gap-2 pt-2 border-t border-surface-200">
              <button type="submit" disabled={loading || !isDirty} className="btn-primary btn">
                {loading ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={cancelEdit} className="btn-secondary btn">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {[
              { label: 'Last name',       value: learner.last_name },
              { label: 'First name',      value: learner.first_name },
              { label: 'Other names',     value: learner.other_names },
              { label: 'Admission no.',   value: learner.admission_number, mono: true },
              { label: 'Gender',          value: learner.gender === 'M' ? 'Male' : learner.gender === 'F' ? 'Female' : learner.gender },
              { label: 'Date of birth',   value: learner.date_of_birth },
              { label: 'Guardian name',   value: learner.guardian_name },
              { label: 'Guardian phone',  value: learner.guardian_phone },
              { label: 'Email',           value: learner.email },
            ].map(({ label, value, mono }) => (
              <div key={label}>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-0.5">{label}</p>
                <p className={`text-sm text-ink ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
