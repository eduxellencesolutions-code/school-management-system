'use client'

import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

interface Props {
  groups: { id: string; name: string; code?: string }[]  // ✅ Allow optional code
  subjects: { id: string; name: string; code: string; template_id: string }[]
  selectedGroupId: string
  selectedSubjectId: string
  userRole?: 'admin' | 'class_teacher' | 'subject_teacher' | 'solo'
  lockSubject?: boolean
}

export default function ScoreSelectors({ 
  groups, 
  subjects, 
  selectedGroupId, 
  selectedSubjectId,
  userRole,
  lockSubject = false
}: Props) {
  const router = useRouter()

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const groupId = e.target.value
    router.push(`/scores?class=${groupId}`)
  }

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subjectId = e.target.value
    router.push(`/scores?class=${selectedGroupId}&subject=${subjectId}`)
  }

  // ✅ Determine if subject selector should be disabled
  const isSubjectLocked = lockSubject || (userRole === 'subject_teacher' && subjects.length === 1)

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-ink">Class</label>
        <select
          value={selectedGroupId}
          onChange={handleGroupChange}
          className="input min-w-[180px]"
        >
          <option value="">Select class…</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      {selectedGroupId && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-ink">Subject</label>
          <select
            value={selectedSubjectId}
            onChange={handleSubjectChange}
            className="input min-w-[180px]"
            disabled={!selectedGroupId || subjects.length === 0 || isSubjectLocked}
          >
            <option value="">Select subject…</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {isSubjectLocked && (
            <span className="text-xs text-ink-muted">
              (Your assigned subject)
            </span>
          )}
        </div>
      )}

      {userRole && (
        <span className="text-xs text-ink-muted bg-surface-50 px-2 py-1 rounded-full">
          {userRole === 'admin' && '🏫 Admin'}
          {userRole === 'class_teacher' && '👨‍🏫 Class Teacher'}
          {userRole === 'subject_teacher' && '📚 Subject Teacher'}
          {userRole === 'solo' && '👤 Solo Teacher'}
        </span>
      )}
    </div>
  )
}
