'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'

interface Props {
  studentId: string
  studentName: string
}

export default function DeleteStudentButton({ studentId, studentName }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`⚠️ Delete student "${studentName}"?\n\nThis will permanently remove the student and all their scores. This action cannot be undone.`)) return
    
    setLoading(true)
    const formData = new FormData()
    formData.append('id', studentId)
    
    const { deleteStudent } = await import('@/app/(dashboard)/students/actions')
    await deleteStudent(formData)
    
    // The action will redirect, so no code after this runs
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="btn btn-sm text-red-600 hover:bg-red-50 border border-red-200"
    >
      <Trash2 size={12} /> {loading ? '...' : 'Delete'}
    </button>
  )
}
