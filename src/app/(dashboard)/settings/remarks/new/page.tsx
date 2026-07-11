import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createRemarkTemplate } from '../actions'

export default function NewRemarkTemplatePage() {
  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings/remarks" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Remark Templates
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">New</span>
      </div>

      <div>
        <h1 className="page-title">New remark template</h1>
        <p className="page-subtitle">Define a remark for a specific performance range.</p>
      </div>

      <form action={createRemarkTemplate} className="card p-5 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Remark type <span className="text-red-500">*</span></label>
          <select name="type" required className="input" defaultValue="teacher">
            <option value="teacher">Teacher remark</option>
            <option value="principal">Principal / Head Teacher remark</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Min score (%) <span className="text-red-500">*</span></label>
            <input name="min_score" type="number" min={0} max={100} step="0.1" required className="input" placeholder="e.g. 70" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Max score (%) <span className="text-red-500">*</span></label>
            <input name="max_score" type="number" min={0} max={100} step="0.1" required className="input" placeholder="e.g. 100" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">Remark text <span className="text-red-500">*</span></label>
          <textarea
            name="remark_text"
            required
            rows={3}
            className="input"
            placeholder="e.g. Excellent performance. Keep up the great work!"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="btn-primary btn">Save remark</button>
          <Link href="/settings/remarks" className="btn-secondary btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}