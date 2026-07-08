'use client'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteStudent } from '@/app/students/actions'

interface Props {
  studentId: string
  studentName: string
}

export default function DeleteStudentButton({ studentId, studentName }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`⚠️ Permanently delete "${studentName}"?\n\nThis will remove the student and all their score history. This cannot be undone.`)) return

    setLoading(true)
    const formData = new FormData()
    formData.append('id', studentId)
    await deleteStudent(formData)
    // deleteStudent always redirects — no code after this runs on success
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="btn btn-sm text-red-600 hover:bg-red-50 border border-red-200"
    >
      <Trash2 size={12} /> {loading ? 'Deleting…' : 'Delete'}
    </button>
  )
}
