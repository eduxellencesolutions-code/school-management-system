'use client'

import { useState } from 'react'
import { Plus, Trash2, Upload, Download, User, BookOpen, Users, Crown, X } from 'lucide-react'
import toast from 'react-hot-toast'

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
  subjects: { id: string; name: string; group_id: string; group?: { name: string } | null }[]
}

export default function TeacherManager({ teachers, classes, subjects }: Props) {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [role, setRole] = useState<string>('subject_teacher')
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  // Get subjects for a specific class
  const getClassSubjects = (classId: string) => {
    return subjects.filter(s => s.group_id === classId)
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeacher) return toast.error('Select a teacher')

    // Validate: If role is class_teacher, must select a class
    if (role === 'class_teacher' && !selectedClass) {
      return toast.error('Class teacher must be assigned to a class')
    }

    // Validate: If role is subject_teacher, must select a subject
    if (role === 'subject_teacher' && !selectedSubject) {
      return toast.error('Subject teacher must be assigned to a subject')
    }

    try {
      const formData = new FormData()
      formData.append('teacher_id', selectedTeacher)
      formData.append('class_id', selectedClass || '')
      formData.append('subject_id', selectedSubject || '')
      formData.append('role', role)

      const { assignTeacher } = await import('@/app/(dashboard)/settings/teachers')
      await assignTeacher(formData)
      toast.success('Teacher assigned successfully!')
      setIsAdding(false)
      // Reset form
      setSelectedTeacher('')
      setSelectedClass('')
      setSelectedSubject('')
      setRole('subject_teacher')
    } catch (error) {
      toast.error('Failed to assign teacher')
      console.error(error)
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
    } catch (error) {
      toast.error('Failed to remove assignment')
      console.error(error)
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
    } catch (error) {
      toast.error('Failed to upload teachers')
      console.error(error)
    }
    setUploading(false)
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
      toast.error('Failed to download template')
      console.error(error)
    }
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-sm text-ink">All Teachers</h2>
          <p className="text-xs text-ink-muted">{teachers.length} teacher{teachers.length !== 1 ? 's' : ''}</p>
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
          <button onClick={() => setIsAdding(true)} className="btn-primary btn-sm btn">
            <Plus size={13} /> Assign Teacher
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
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
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
                  // Clear subject if class changes
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
              <button type="submit" className="btn-primary btn-sm btn w-full">Assign</button>
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
        {teachers.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <User size={40} className="text-surface-200 mx-auto mb-3" />
            <p className="text-sm text-ink-muted mb-2">No teachers added yet</p>
            <p className="text-xs text-ink-faint">
              Upload a CSV file or assign teachers manually
            </p>
          </div>
        ) : (
          teachers.map(teacher => {
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

                {/* Assignments */}
                {teacher.teacher_assignments && teacher.teacher_assignments.length > 0 && (
                  <div className="ml-13 flex flex-wrap gap-2">
                    {teacher.teacher_assignments.map(assignment => {
                      // ✅ FIXED: Handle both single object and array cases
                      const getGroupName = () => {
                        if (!assignment.groups) return null
                        const g = Array.isArray(assignment.groups) ? assignment.groups[0] : assignment.groups
                        return g?.name || null
                      }
                      
                      const getSubjectName = () => {
                        if (!assignment.subjects) return null
                        const s = Array.isArray(assignment.subjects) ? assignment.subjects[0] : assignment.subjects
                        return s?.name || null
                      }

                      const groupName = getGroupName()
                      const subjectName = getSubjectName()

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
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
