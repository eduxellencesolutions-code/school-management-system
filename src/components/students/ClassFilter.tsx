'use client'

import { useRouter, usePathname } from 'next/navigation'

interface Group { id: string; name: string }

interface Props {
  groups: Group[]
  selectedClass: string
}

export default function ClassFilter({ groups, selectedClass }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function handleChange(val: string) {
    const url = new URL(window.location.href)
    val ? url.searchParams.set('class', val) : url.searchParams.delete('class')
    router.push(`${pathname}?${url.searchParams.toString()}`)
  }

  return (
    <div className="flex gap-3 items-center">
      <select
        defaultValue={selectedClass}
        onChange={e => handleChange(e.target.value)}
        className="input max-w-[200px]"
      >
        <option value="">All classes</option>
        {groups.map(g => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
    </div>
  )
}
