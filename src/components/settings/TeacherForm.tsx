'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { User, Mail, Phone, Upload, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
  classes: { id: string; name: string }[]
  subjects: { id: string; name: string; group_id: string; group?: { name: string } | null }[]
  orgId: string
}

export default function TeacherForm({ classes, subjects, orgId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [uploadingSig, setUploadingSig] = useState(false)
  const [sigPreview, setSigPreview] = useState<string | null>(null)
  const [sigUrl, setSigUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'teacher' as 'teacher' | 'lecturer' | 'assistant',
    password: '',
    selectedClasses: [] as string[],
    selectedSubjects: [] as string[],
    isClassTeacher: false,
    classTeacherOf: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleClassToggle = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(classId)
        ? prev.selectedClasses.filter(id => id !== classId)
        : [...prev.selectedClasses, classId],
    }))
  }

  const handleSubjectToggle = (subjectId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.includes(subjectId)
        ? prev.selectedSubjects.filter(id => id !== subjectId)
        : [...prev.selectedSubjects, subjectId],
    }))
  }

  const handleSignatureUpload = async (file: File) => {
    setUploadingSig(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `signatures/${orgId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('signatures').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('signatures').getPublicUrl(path)
      setSigUrl(publicUrl)
      setSigPreview(URL.createObjectURL(file))
      toast.success('Signature uploaded')
    } catch {
      toast.error('Failed to upload signature')
    } finally {
      setUploadingSig(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.error('Name, email and password are required')
      return
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      // Sign up the teacher via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            name: formData.name.trim(),
            role: formData.role,
            organization_id: orgId,
          },
        },
      })

      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('Failed to create user')

      // Update the user row with signature and phone
      const { error: updateError } = await supabase
        .from('users')
        .update({
          phone: formData.phone || null,
          signature_url: sigUrl || null,
          organization_id: orgId,
          role: formData.role,
        })
        .eq('id', authData.user.id)

      if (updateError) console.error('User update error:', updateError)

      // Create teacher assignments
      const assignments: { teacher_id: string; class_id?: string; subject_id?: string; role: string }[] = []

      // Class teacher assignment
      if (formData.isClassTeacher && formData.classTeacherOf) {
        assignments.push({
          teacher_id: authData.user.id,
          class_id: formData.classTeacherOf,
          role: 'class_teacher',
        })
      }

      // Subject teacher assignments
      formData.selectedSubjects.forEach(subjectId => {
        const subject = subjects.find(s => s.id === subjectId)
        assignments.push({
          teacher_id: authData.user.id,
          class_id: subject?.group_id || undefined,
          subject_id: subjectId,
          role: 'subject_teacher',
        })
      })

      if (assignments.length > 0) {
        const { error: assignError } = await supabase
          .from('teacher_assignments')
          .insert(assignments)
        if (assignError) console.error('Assignment error:', assignError)
      }

      toast.success(`Teacher ${formData.name} added successfully!`)
      router.push('/settings/teachers')
      router.refresh()
    } catch (err) {
      console.error('Error adding teacher:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to add teacher')
    } finally {
      setLoading(false)
    }
  }

  // Filter subjects by selected classes
  const availableSubjects = formData.selectedClasses.length > 0
    ? subjects.filter(s => formData.selectedClasses.includes(s.group_id))
    : subjects

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">

      {/* Basic Info */}
      <div className="card p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
          <User size={15} className="text-brand-500" /> Teacher Information
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-ink mb-1">Full name *</label>
            <input name="name" type="text" value={formData.name} onChange={handleChange}
              className="input" placeholder="e.g. Amara Okafor" required />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Email address *</label>
            <input name="email" type="email" value={formData.email} onChange={handleChange}
              className="input" placeholder="teacher@school.com" required />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Phone (optional)</label>
            <input name="phone" type="tel" value={formData.phone} onChange={handleChange}
              className="input" placeholder="08012345678" />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Role</label>
            <select name="role" value={formData.role} onChange={handleChange} className="input">
              <option value="teacher">Teacher</option>
              <option value="lecturer">Lecturer</option>
              <option value="assistant">Assistant</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Temporary password *</label>
            <input name="password" type="password" value={formData.password} onChange={handleChange}
              className="input" placeholder="Min. 8 characters" required minLength={8} />
            <p className="text-xs text-ink-faint mt-1">Teacher can change this after first login</p>
          </div>
        </div>
      </div>

      {/* Signature */}
      <div className="card p-6 flex flex-col gap-3">
        <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
          <Upload size={15} className="text-brand-500" /> Teacher Signature (optional)
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-32 h-20 rounded border border-surface-200 flex items-center justify-center overflow-hidden bg-surface-50">
            {sigPreview
              ? <img src={sigPreview} alt="Signature" className="w-full h-full object-contain" />
              : <span className="text-xs text-ink-faint">No signature</span>}
          </div>
          <div>
            <label className="btn-secondary btn-sm btn cursor-pointer">
              {uploadingSig ? 'Uploading…' : 'Upload signature'}
              <input type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleSignatureUpload(f) }}
                disabled={uploadingSig} />
            </label>
            <p className="text-xs text-ink-muted mt-1">PNG or JPG, transparent background preferred</p>
          </div>
        </div>
      </div>

      {/* Class Assignment */}
      <div className="card p-6 flex flex-col gap-3">
        <h2 className="font-semibold text-sm text-ink">Class Assignment</h2>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="isClassTeacher" checked={formData.isClassTeacher}
            onChange={handleChange} className="w-4 h-4 rounded border-surface-300 text-brand-500" />
          <span className="text-sm text-ink">Assign as Class Teacher</span>
        </label>

        {formData.isClassTeacher && (
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Class teacher of</label>
            <select name="classTeacherOf" value={formData.classTeacherOf} onChange={handleChange} className="input max-w-xs">
              <option value="">Select class…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-ink mb-2">
            Classes this teacher has access to
          </label>
          <div className="flex flex-wrap gap-2">
            {classes.map(c => (
              <label key={c.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs cursor-pointer transition-colors
                ${formData.selectedClasses.includes(c.id)
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-surface-200 text-ink-muted hover:border-brand-300'}`}>
                <input type="checkbox" className="sr-only"
                  checked={formData.selectedClasses.includes(c.id)}
                  onChange={() => handleClassToggle(c.id)} />
                {c.name}
              </label>
            ))}
            {classes.length === 0 && <p className="text-xs text-ink-faint">No classes yet — create a class first</p>}
          </div>
        </div>
      </div>

      {/* Subject Assignment */}
      <div className="card p-6 flex flex-col gap-3">
        <h2 className="font-semibold text-sm text-ink">Subject Assignment</h2>
        <p className="text-xs text-ink-muted">
          {formData.selectedClasses.length > 0
            ? 'Showing subjects from selected classes'
            : 'Select classes above to filter subjects, or assign from all subjects'}
        </p>
        <div className="flex flex-wrap gap-2">
          {availableSubjects.map(s => (
            <label key={s.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs cursor-pointer transition-colors
              ${formData.selectedSubjects.includes(s.id)
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-surface-200 text-ink-muted hover:border-green-300'}`}>
              <input type="checkbox" className="sr-only"
                checked={formData.selectedSubjects.includes(s.id)}
                onChange={() => handleSubjectToggle(s.id)} />
              {s.name}
              {s.group?.name && <span className="text-ink-faint ml-1">({s.group.name})</span>}
            </label>
          ))}
          {availableSubjects.length === 0 && (
            <p className="text-xs text-ink-faint">No subjects available</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/settings/teachers" className="btn-secondary btn">
          <ArrowLeft size={14} /> Cancel
        </Link>
        <button type="submit" disabled={loading} className="btn-primary btn">
          <Save size={14} /> {loading ? 'Adding teacher…' : 'Add teacher'}
        </button>
      </div>
    </form>
  )
}
