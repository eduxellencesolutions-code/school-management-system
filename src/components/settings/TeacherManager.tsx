'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Upload, Download, User, BookOpen, Users, Crown, X, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface Teacher {
  id: string
  name: string
  email: string
  role: string
  teacher_assignments: Assignment[]
}

interface Assignment {
  id: string
  class_id: string | null
  subject_id: string | null
  role: string
  groups: { id: string; name: string } | { id: string; name: string }[] | null
  subjects: { id: string; name: string } | { id: string; name: string }[] | null
}

interface Props {
  teachers: Teacher[]
  classes: { id: string; name: string }[]
  subjects: { id: string; name: string; group_id: string; group: { name: string } | null }[]
}

export default function TeacherManager({ teachers, classes, subjects }: Props) {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [role, setRole] = useState<string>('subject_teacher')
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [localTeachers, setLocalTeachers] = useState<Teacher[]>(teachers)
  const [loading, setLoading] = useState(false)

  // ✅ Sync when props change
  useEffect(() => {
    setLocalTeachers(teachers)
  }, [teachers])

  // Get subjects for a specific class
  const getClassSubjects = (classId: string) => {
    return subjects.filter(s => s.group_id === classId)
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    
    if (!selectedTeacher) return toast.error('Select a teacher')

    if (role === 'class_teacher' && !selectedClass) {
      return toast.error('Class teacher must be assigned to a class')
    }

    if (role === 'subject_teacher' && !selectedSubject) {
      return toast.error('Subject teacher must be assigned to a subject')
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('teacher_id', selectedTeacher)
      formData.append('class_id', selectedClass || '')
      formData.append('subject_id', selectedSubject || '')
      formData.append('role', role)

      const { assignTeacher } = await import('@/app/(dashboard)/settings/teachers')
      await assignTeacher(formData)
      
      toast.success('Teacher assigned successfully!')
      
      // ✅ Refresh the page to show updated assignments
      window.location.reload()
      
      setIsAdding(false)
      setSelectedTeacher('')
      setSelectedClass('')
      setSelectedSubject('')
      setRole('subject_teacher')
    } catch (error) {
      console.error('Assignment error:', error)
      toast.error('Failed to assign teacher')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    if (!confirm('Remove this assignment?')) return

    try {
      const formData = new FormData()
      formData.append('assignment_id', assignmentId)
      const { removeAssignment } = await import('@/app/(dashboard)/settings/teachers')
      await removeAssignment(formData)
      
      toast.success('Assignment removed')
      
      // ✅ Refresh to show updated assignments
      window.location.reload()
    } catch (error) {
      console.error('Remove assignment error:', error)
      toast.error('Failed to remove assignment')
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const { uploadTeachers } = await import('@/app/(dashboard)/settings/teachers')
      await uploadTeachers(formData)
      
      toast.success('Teachers uploaded successfully!')
      setShowUpload(false)
      
      // ✅ Refresh to show new teachers
      window.location.reload()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload teachers')
    } finally {
      setUploading(false)
    }
  }

  async function handleDownloadTemplate() {
    try {
      const response = await fetch('/api/teachers/template')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'teachers_template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Template downloaded')
    } catch (error) {
      console.error('Template download error:', error)
      toast.error('Failed to download template')
    }
  }

  // ✅ Helper to get display name from groups
  const getGroupDisplayName = (groups: any): string | null => {
    if (!groups) return null
    if (Array.isArray(groups)) {
      return groups[0]?.name || null
    }
    return groups.name || null
  }

  // ✅ Helper to get display name from subjects
  const getSubjectDisplayName = (subjects: any): string | null => {
    if (!subjects) return null
    if (Array.isArray(subjects)) {
      return subjects[0]?.name || null
    }
    return subjects.name || null
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-sm text-ink">All Teachers</h2>
          <p className="text-xs text-ink-muted">{localTeachers.length} teacher{localTeachers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleDownloadTemplate}
            className="btn-secondary btn-sm btn"
          >
            <Download size={13} /> Template
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="btn-secondary btn-sm btn"
          >
            <Upload size={13} /> Upload CSV
          </button>
          <Link href="/settings/teachers/new" className="btn-primary btn-sm btn">
            <Plus size={13} /> Add Teacher
          </Link>
          <button onClick={() => setIsAdding(!isAdding)} className="btn-primary btn-sm btn">
            <Plus size={13} /> {isAdding ? 'Cancel' : 'Assign Teacher'}
          </button>
        </div>
      </div>

      {/* CSV Upload Section */}
      {showUpload && (
        <div className="border-b border-surface-200 p-5 bg-surface-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink">Upload Teachers from CSV</h3>
            <button onClick={() => setShowUpload(false)} className="text-ink-faint hover:text-ink">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <label className="btn-primary btn-sm btn cursor-pointer">
              {uploading ? 'Uploading...' : 'Choose CSV File'}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
            <span className="text-xs text-ink-muted">
              Max 500 teachers at once. Download template for format.
            </span>
          </div>
        </div>
      )}

      {/* Assignment Form */}
      {isAdding && (
        <div className="border-b border-surface-200 p-5 bg-brand-50">
          <h3 className="text-sm font-semibold text-brand-700 mb-3">Assign Teacher to Class or Subject</h3>
          <form onSubmit={handleAssign} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Teacher *</label>
              <select
                className="input"
                value={selectedTeacher}
                onChange={e => setSelectedTeacher(e.target.value)}
                required
              >
                <option value="">Select teacher…</option>
                {localTeachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {localTeachers.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠️ No teachers found. Add a teacher first.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">Role *</label>
              <select
                className="input"
                value={role}
                onChange={e => setRole(e.target.value)}
                required
              >
                <option value="subject_teacher">Subject Teacher</option>
                <option value="class_teacher">Class Teacher</option>
                <option value="assistant">Assistant</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                {role === 'class_teacher' ? 'Class *' : 'Class (optional)'}
              </label>
              <select
                className="input"
                value={selectedClass}
                onChange={e => {
                  setSelectedClass(e.target.value)
                  if (selectedSubject) {
                    const classSubjects = getClassSubjects(e.target.value)
                    if (!classSubjects.find(s => s.id === selectedSubject)) {
                      setSelectedSubject('')
                    }
                  }
                }}
                required={role === 'class_teacher'}
              >
                <option value="">{role === 'class_teacher' ? 'Select class…' : 'No class'}</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                {role === 'subject_teacher' ? 'Subject *' : 'Subject (optional)'}
              </label>
              <select
                className="input"
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                required={role === 'subject_teacher'}
                disabled={!selectedClass && role === 'subject_teacher'}
              >
                <option value="">
                  {role === 'subject_teacher' ? 'Select subject…' : 'No subject'}
                </option>
                {selectedClass ? (
                  getClassSubjects(selectedClass).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))
                ) : (
                  subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.group?.name ? `(${s.group.name})` : ''}
                    </option>
                  ))
                )}
              </select>
              {role === 'subject_teacher' && !selectedClass && (
                <p className="text-xs text-amber-600 mt-1">
                  Tip: Select a class first to see its subjects
                </p>
              )}
            </div>

            <div className="flex items-end gap-2">
              <button type="submit" disabled={loading} className="btn-primary btn-sm btn w-full">
                {loading ? 'Assigning...' : 'Assign'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false)
                  setSelectedTeacher('')
                  setSelectedClass('')
                  setSelectedSubject('')
                  setRole('subject_teacher')
                }}
                className="btn-secondary btn-sm btn"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teacher List */}
      <div className="divide-y divide-surface-200">
        {localTeachers.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <User size={40} className="text-surface-200 mx-auto mb-3" />
            <p className="text-sm text-ink-muted mb-2">No teachers added yet</p>
            <p className="text-xs text-ink-faint">
              Upload a CSV file or add teachers manually using the "Add Teacher" button.
            </p>
          </div>
        ) : (
          localTeachers.map(teacher => {
            // Find if this teacher is a class teacher
            const classTeacherAssignment = teacher.teacher_assignments?.find(a => a.role === 'class_teacher')
            const subjectAssignments = teacher.teacher_assignments?.filter(a => a.role === 'subject_teacher') || []
            
            return (
              <div key={teacher.id} className="px-5 py-4 hover:bg-surface-50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {teacher.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-ink">{teacher.name}</p>
                    <p className="text-xs text-ink-muted truncate">{teacher.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {classTeacherAssignment && (
                      <span className="badge badge-amber text-[10px] flex items-center gap-1">
                        <Crown size={10} /> Class Teacher
                      </span>
                    )}
                    {subjectAssignments.length > 0 && (
                      <span className="badge badge-blue text-[10px] flex items-center gap-1">
                        <BookOpen size={10} /> {subjectAssignments.length} Subject{subjectAssignments.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="badge badge-gray text-[10px]">{teacher.role}</span>
                  </div>
                </div>

                {/* ✅ Display Assignments */}
                {teacher.teacher_assignments && teacher.teacher_assignments.length > 0 ? (
                  <div className="ml-13 flex flex-wrap gap-2">
                    {teacher.teacher_assignments.map(assignment => {
                      const groupName = getGroupDisplayName(assignment.groups)
                      const subjectName = getSubjectDisplayName(assignment.subjects)

                      return (
                        <div
                          key={assignment.id}
                          className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs border ${
                            assignment.role === 'class_teacher' 
                              ? 'bg-amber-50 border-amber-200' 
                              : 'bg-surface-50 border-surface-200'
                          }`}
                        >
                          {assignment.role === 'class_teacher' && (
                            <Crown size={12} className="text-amber-500" />
                          )}
                          {assignment.role === 'subject_teacher' && (
                            <BookOpen size={12} className="text-green-500" />
                          )}
                          {groupName && (
                            <span className="font-medium">{groupName}</span>
                          )}
                          {groupName && subjectName && (
                            <span className="text-ink-faint">·</span>
                          )}
                          {subjectName && (
                            <span>{subjectName}</span>
                          )}
                          {assignment.role === 'class_teacher' && (
                            <span className="text-[10px] text-amber-600 font-medium ml-1">(Class Teacher)</span>
                          )}
                          <button
                            onClick={() => handleRemoveAssignment(assignment.id)}
                            className="ml-1 p-0.5 text-ink-faint hover:text-red-500 transition-colors"
                            title="Remove assignment"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="ml-13 text-xs text-ink-faint italic">
                    No assignments yet. Click "Assign Teacher" to add.
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
