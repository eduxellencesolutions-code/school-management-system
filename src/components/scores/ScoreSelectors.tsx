'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, Users, BookOpen, Loader2 } from 'lucide-react'

interface Group {
  id: string
  name: string
  level?: string
}

interface Subject {
  id: string
  name: string
  code?: string
}

interface Props {
  onSelect: (groupId: string, subjectId: string) => void
  selectedGroupId?: string
  selectedSubjectId?: string
}

export default function ScoreSelectors({ onSelect, selectedGroupId, selectedSubjectId }: Props) {
  const supabase = createClient()

  const [groups, setGroups] = useState<Group[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [groupId, setGroupId] = useState(selectedGroupId ?? '')
  const [subjectId, setSubjectId] = useState(selectedSubjectId ?? '')
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  // Load groups on mount
  useEffect(() => {
    async function fetchGroups() {
      setLoadingGroups(true)
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, level')
        .order('name')
      if (!error && data) setGroups(data)
      setLoadingGroups(false)
    }
    fetchGroups()
  }, [])

  // Load subjects whenever group changes
  useEffect(() => {
    if (!groupId) {
      setSubjects([])
      setSubjectId('')
      return
    }

    async function fetchSubjects() {
      setLoadingSubjects(true)
      setSubjectId('')

      // Fetch subjects assigned to this group via group_subjects join table
      const { data, error } = await supabase
        .from('group_subjects')
        .select('subject:subjects(id, name, code)')
        .eq('group_id', groupId)
        .order('subjects(name)')

      if (!error && data) {
        const flat = data
          .map((row: any) => row.subject)
          .filter(Boolean) as Subject[]
        setSubjects(flat)
      }
      setLoadingSubjects(false)
    }
    fetchSubjects()
  }, [groupId])

  // Fire onSelect whenever both are chosen
  useEffect(() => {
    if (groupId && subjectId) {
      onSelect(groupId, subjectId)
    }
  }, [groupId, subjectId])

  function handleGroupChange(val: string) {
    setGroupId(val)
    setSubjectId('') // reset subject on group change
  }

  const selectedGroup = groups.find(g => g.id === groupId)
  const selectedSubject = subjects.find(s => s.id === subjectId)

  return (
    <div className="card p-4">
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Group selector */}
        <div className="flex-1">
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            <Users size={11} className="inline mr-1" />
            Class / Group
          </label>
          <div className="relative">
            <select
              value={groupId}
              onChange={e => handleGroupChange(e.target.value)}
              disabled={loadingGroups}
              className="w-full appearance-none rounded-lg border border-surface-200 bg-white px-3 py-2.5 pr-9 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingGroups ? 'Loading classes…' : 'Select a class'}
              </option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}{g.level ? ` — ${g.level}` : ''}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted">
              {loadingGroups
                ? <Loader2 size={14} className="animate-spin" />
                : <ChevronDown size={14} />
              }
            </div>
          </div>
        </div>

        {/* Subject selector */}
        <div className="flex-1">
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
            <BookOpen size={11} className="inline mr-1" />
            Subject
          </label>
          <div className="relative">
            <select
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              disabled={!groupId || loadingSubjects}
              className="w-full appearance-none rounded-lg border border-surface-200 bg-white px-3 py-2.5 pr-9 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!groupId
                  ? 'Select a class first'
                  : loadingSubjects
                  ? 'Loading subjects…'
                  : subjects.length === 0
                  ? 'No subjects assigned'
                  : 'Select a subject'}
              </option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.code ? ` (${s.code})` : ''}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted">
              {loadingSubjects
                ? <Loader2 size={14} className="animate-spin" />
                : <ChevronDown size={14} />
              }
            </div>
          </div>
        </div>

      </div>

      {/* Selection summary pill */}
      {selectedGroup && selectedSubject && (
        <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
          <span className="badge badge-gray">{selectedGroup.name}</span>
          <span>→</span>
          <span className="badge badge-gray">{selectedSubject.name}</span>
          <span className="ml-auto text-green-600 font-medium">✓ Ready to enter scores</span>
        </div>
      )}
    </div>
  )
}
