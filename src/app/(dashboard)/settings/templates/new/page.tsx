import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TemplateBuilder from '@/components/settings/TemplateBuilder'
import { createTemplate } from '../actions'

export default function NewTemplatePage() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings/templates" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Templates
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">New template</span>
      </div>

      <div>
        <h1 className="page-title">New assessment template</h1>
        <p className="page-subtitle">
          Define the components teachers will score against. You can load a preset or build your own.
        </p>
      </div>

      <TemplateBuilder
        action={createTemplate}
        submitLabel="Create template"
        defaultComponents={[
          { name: 'CA 1', max_score: '20', pass_mark: '8' },
          { name: 'CA 2', max_score: '20', pass_mark: '8' },
          { name: 'Exam', max_score: '60', pass_mark: '24' },
        ]}
      />
    </div>
  )
}
