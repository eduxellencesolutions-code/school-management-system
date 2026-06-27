'use client'

import Link from 'next/link'

interface Group { id: string; name: string; code?: string | null }
interface Subject { id: string; name: string }

interface Props {
  groups: Group[]
  subjects: Subject[]
  selectedGroupId: string
  selectedSubjectId: string
}

export default function ScoreSelectors({ groups, subjects, selectedGroupId, selectedSubjectId }: Props) {
  return (
    <div className="card p-4 flex flex-wrap gap-4 items-end">
      <div className="flex flex-col gap-1 min-w-[200px]">
        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Class</label>
        <select
          defaultValue={selectedGroupId}
          onChange={(e) => {
            const url = new URL(window.location.href)
            url.searchParams.set('class', e.target.value)
            url.searchParams.delete('subject')
            window.location.href = url.toString()
          }}
          className="input"
        >
          <option value="">Select class…</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.name}{g.code ? ` (${g.code})` : ''}</option>
          ))}
        </select>
      </div>

      {selectedGroupId && subjects.length > 0 && (
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Subject</label>
          <select
            defaultValue={selectedSubjectId}
            onChange={(e) => {
              const url = new URL(window.location.href)
              url.searchParams.set('subject', e.target.value)
              window.location.href = url.toString()
            }}
            className="input"
          >
            <option value="">Select subject…</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {selectedGroupId && (
        <Link href={`/classes/${selectedGroupId}`} className="btn-secondary btn-sm btn mb-px">
          Manage class →
        </Link>
      )}
    </div>
  )
}
