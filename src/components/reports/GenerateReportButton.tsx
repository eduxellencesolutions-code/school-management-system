'use client'

import { useTransition } from 'react'
import { generateReport } from '@/app/(dashboard)/reports/actions'
import { FileText, Loader2 } from 'lucide-react'

interface Props {
  groupId: string
  groupName: string
  type: 'broadsheet' | 'result_cards'
  label?: string
}

export default function GenerateReportButton({ groupId, groupName, type, label }: Props) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`Generate ${type === 'broadsheet' ? 'broadsheet' : 'result cards'} for "${groupName}"?`)) return
    const fd = new FormData()
    fd.append('group_id', groupId)
    fd.append('type', type)
    startTransition(() => { generateReport(fd) })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="btn-primary btn-sm btn disabled:opacity-50"
    >
      {pending
        ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
        : <><FileText size={13} /> {label ?? 'Generate report'}</>
      }
    </button>
  )
}
