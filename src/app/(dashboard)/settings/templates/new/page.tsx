import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TemplateBuilder from '@/components/settings/TemplateBuilder'
import { createTemplate } from '../actions'

interface Props {
  searchParams: Promise<{ error?: string; success?: string }>
}

export default async function NewTemplatePage({ searchParams }: Props) {
  const params = await searchParams
  const error = params.error
  const success = params.success

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

      {/* ✅ Display error message from URL */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{decodeURIComponent(error)}</p>
        </div>
      )}
      
      {/* ✅ Display success message if needed */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">{decodeURIComponent(success)}</p>
        </div>
      )}

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
