'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, Users, BookOpen, Loader2 } from 'lucide-react'

interface Group {
  id: string
  name: string
  code?: string
  type?: string
}

interface Subject {
  id: string
  name: string
  code?: string
  template_id?: string
}

interface Props {
  onSelect: (params: {
    groupId: string
    subjectId: string
    subjectTemplateId: string | null
  }) => void
}

export default function ScoreSelectors({ onSelect }: Props) {
  const supabase = createClient()

  const [groups, setGroups] = useState<Group[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [groupId, setGroupId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  // Load active groups on mount
  useEffect(() => {
    async function fetchGroups() {
      setLoadingGroups(true)
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, code, type')
        .eq('is_active', true)
        .order('name')
      if (!error && data) setGroups(data)
      setLoadingGroups(false)
    }
    fetchGroups()
  }, [])

  // Load subjects for the selected group
  useEffect(() => {
    if (!groupId) {
      setSubjects([])
      setSubjectId('')
      return
    }

    async function fetchSubjects() {
      setLoadingSubjects(true)
      setSubjectId('')
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code, template_id')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('name')
      if (!error && data) setSubjects(data)
      setLoadingSubjects(false)
    }
    fetchSubjects()
  }, [groupId])

  // Fire onSelect when both are chosen
  useEffect(() => {
    if (!groupId || !subjectId) return
    const subject = subjects.find(s => s.id === subjectId)
    onSelect({
      groupId,
      subjectId,
      subjectTemplateId: subject?.template_id ?? null,
    })
  }, [groupId, subjectId])

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
              onChange={e => setGroupId(e.target.value)}
              disabled={loadingGroups}
              className="w-full appearance-none rounded-lg border border-surface-200 bg-white px-3 py-2.5 pr-9 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingGroups ? 'Loading classes…' : 'Select a class'}
              </option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}{g.code ? ` (${g.code})` : ''}
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
                  ? 'No subjects found for this class'
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

      {/* Selection summary */}
      {selectedGroup && selectedSubject && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="badge badge-gray">{selectedGroup.name}</span>
          <span className="text-ink-muted">→</span>
          <span className="badge badge-gray">{selectedSubject.name}</span>
          {!selectedSubject.template_id && (
            <span className="ml-2 text-amber-600 font-medium">
              ⚠ No assessment template assigned to this subject
            </span>
          )}
          {selectedSubject.template_id && (
            <span className="ml-auto text-green-600 font-medium">✓ Ready to enter scores</span>
          )}
        </div>
      )}
    </div>
  )
}
