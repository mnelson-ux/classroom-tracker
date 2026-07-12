'use client'

import { useEffect, useState } from 'react'
import { schoolLabel } from '@/lib/schools'
import type { Feedback } from '@/lib/types'

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function FeedbackManager({ token }: { token: string }) {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'open' | 'all'>('open')

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/feedback?ts=${Date.now()}`, { headers, cache: 'no-store' })
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/feedback/${id}`, { method: 'PUT', headers, body: JSON.stringify({ status }) })
    load()
  }
  const remove = async (id: string) => {
    if (!confirm('Delete this submission?')) return
    await fetch(`/api/admin/feedback/${id}`, { method: 'DELETE', headers })
    load()
  }

  const shown = items.filter((i) => filter === 'all' || i.status === 'open')
  const openCount = items.filter((i) => i.status === 'open').length

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Requests &amp; Issues</h2>
        <div className="inline-flex gap-1 rounded-xl bg-gray-100 p-1">
          {(['open', 'all'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition ${filter === f ? 'bg-white text-purple-800 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
              {f === 'open' ? `Open (${openCount})` : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm italic text-gray-500">{filter === 'open' ? 'No open requests or issues.' : 'Nothing submitted yet.'}</p>
      ) : (
        <div className="space-y-3">
          {shown.map((f) => (
            <div key={f.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${f.status === 'resolved' ? 'border-gray-200 opacity-60' : 'border-gray-200'}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${f.type === 'issue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {f.type === 'issue' ? '⚠ Issue' : '💡 Request'}
                </span>
                {f.status === 'resolved' && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Resolved</span>}
                <span className="text-xs text-gray-500">{f.submitted_by ?? 'Staff'}{f.school ? ` · ${schoolLabel(f.school)}` : ''} · {fmt(f.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-900">{f.message}</p>
              <div className="mt-3 flex gap-2">
                {f.status === 'open' ? (
                  <button onClick={() => setStatus(f.id, 'resolved')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Mark resolved</button>
                ) : (
                  <button onClick={() => setStatus(f.id, 'open')} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Reopen</button>
                )}
                <button onClick={() => remove(f.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
