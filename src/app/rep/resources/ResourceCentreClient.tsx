'use client'
import { useEffect, useState } from 'react'

export default function ResourceCentreClient() {
  const [resources, setResources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/representatives/resources').then(r => r.json()).then(d => {
      setResources(d.resources ?? [])
      setLoading(false)
    })
  }, [])

  async function download(id: string) {
    const res = await fetch(`/api/representatives/resources/${id}/download`, { method: 'POST' })
    const json = await res.json()
    if (json.error) { alert(json.error); return }
    window.open(json.url, '_blank')
  }

  const categories = Array.from(new Set(resources.map(r => r.resource_categories?.label).filter(Boolean)))
  const filtered = resources.filter(r =>
    (categoryFilter === 'all' || r.resource_categories?.label === categoryFilter) &&
    (search === '' || r.title.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">📚 Resource Centre</h1>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text" placeholder="Search resources…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No resources found.</p>}
        {filtered.map(r => (
          <div key={r.id} className="border rounded-lg p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {r.is_important && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">📌 Important</span>}
                {r.is_featured && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">⭐ Featured</span>}
                <p className="font-medium text-gray-900">{r.title}</p>
              </div>
              {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
              <p className="text-xs text-gray-400 mt-1">
                {r.resource_categories?.label ?? 'Uncategorized'}
                {r.version && ` · v${r.version}`}
                {' · Updated ' + new Date(r.updated_at).toLocaleDateString()}
              </p>
            </div>
            <button onClick={() => download(r.id)} className="btn-sm btn bg-blue-50 text-blue-600 whitespace-nowrap flex-shrink-0">
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}