import { supabase } from '../client'

const API_BASE = 'https://results.eduxellence.org'

export async function createTeacherAccount(params: {
  name: string; email: string; phone?: string; role: 'teacher' | 'lecturer' | 'assistant' | 'principal'
  password: string; classId?: string; subjectIds?: string[]; subjectGroupMap?: Record<string, string>; isClassTeacher?: boolean
}): Promise<{ teacherId: string; teacherName: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_BASE}/api/staff/create-teacher-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return { teacherId: data.teacherId, teacherName: data.teacherName }
}