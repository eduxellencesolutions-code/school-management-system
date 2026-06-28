'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ChevronDown, Users, BookOpen, Loader2 } from 'lucide-react'

interface Group {
  id: string
  name: string
  code?: string
}

interface Subject {
  id: string
  name: string
  code?: string
  template_id?: string
}

interface Props {
  groups: Group[]
  subjects: Subject[]
  selectedGroupId: string
  selectedSubjectId: string
}

export default function ScoreSelectors({
  groups,
  subjects,
  selectedGroupId,
  selectedSubjectId,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const [groupId, setGroupId] = useState(selectedGroupId)
  const [subjectId, setSubjectId] = useState(selectedSubjectId)
  const [navigating, setNavigating] = useState(false)

  useEffect(() => { setGroupId(selectedGroupId) }, [selectedGroupId])
  useEffect(() => { setSubjectId(selectedSubjectId) }, [selectedSubjectId])

  function handleGroupChange(val: string) {
    setGroupId(val)
    setSubjectId('')
    setNavigating(true)
    router.push(`${pathname}?class=${val}`)
  }

  function handleSubjectChange(val: string) {
    setSubjectId(val)
    if (!val) return
    setNavigating(true)
    router.push(`${pathname}?class=${groupId}&subject=${val}`)
  }

  const selectedGroup = groups.find(g => g.id === groupId)
  const selectedSubject = subjects.find(s => s.id === subjectId)
  const noTemplate = selectedSubject && !selectedSubject.template_id

  return (
    <div className="card p-4">
      <div className="flex flex-col sm:flex-row gap-3">

        <div className="flex-1">
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            <Users size={11} className="inline mr-1" />
            Class / Group
          </label>
          <div className="relative">
            <select
              value={groupId}
              onChange={e => handleGroupChange(e.target.value)}
              className="w-full appearance-none rounded-lg border border-surface-200 bg-white px-3 py-2.5 pr-9 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              <option value="">Select a class</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}{g.code ? ` (${g.code})` : ''}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted">
              {navigating && !subjectId
                ? <Loader2 size={14} className="animate-spin" />
                : <ChevronDown size={14} />
              }
            </div>
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            <BookOpen size={11} className="inline mr-1" />
            Subject
          </label>
          <div className="relative">
            <select
              value={subjectId}
              onChange={e => handleSubjectChange(e.target.value)}
              disabled={!groupId || subjects.length === 0}
              className="w-full appearance-none rounded-lg border border-surface-200 bg-white px-3 py-2.5 pr-9 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!groupId
                  ? 'Select a class first'
                  : subjects.length === 0
                  ? 'No subjects in this class'
                  : 'Select a subject'}
              </option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.code ? ` (${s.code})` : ''}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted">
              {navigating && groupId && !subjectId
                ? <Loader2 size={14} className="animate-spin" />
                : <ChevronDown size={14} />
              }
            </div>
          </div>
        </div>

      </div>

      {selectedGroup && selectedSubject && (
        <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
          <span className="badge badge-gray">{selectedGroup.name}</span>
          <span className="text-ink-muted">→</span>
          <span className="badge badge-gray">{selectedSubject.name}</span>
          {noTemplate ? (
            <span className="ml-2 text-amber-600 font-medium">
              ⚠ No assessment template — components missing
            </span>
          ) : (
            <span className="ml-auto text-green-600 font-medium">
              ✓ Ready to enter scores
            </span>
          )}
        </div>
      )}

      {selectedGroup && subjects.length === 0 && (
        <p className="mt-3 text-xs text-amber-600">
          No subjects assigned to <strong>{selectedGroup.name}</strong> yet.
        </p>
      )}
    </div>
  )
}
