'use client'

import { useState } from 'react'
import Link from 'next/link'
import { HelpCircle } from 'lucide-react'

interface Props {
  text: string
}

export default function NeedHelp({ text }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
      >
        <HelpCircle size={13} />
        Need help?
      </button>

      {open && (
        <div className="absolute z-10 top-full left-0 mt-1 w-64 rounded-md border border-gray-200 bg-white p-3 shadow-lg text-left">
          <p className="text-xs text-gray-600">{text}</p>
          <Link href="/setup-guide" className="text-xs font-medium text-blue-600 hover:text-blue-700 mt-2 inline-block">
            Open Setup Guide →
          </Link>
        </div>
      )}
    </div>
  )
}