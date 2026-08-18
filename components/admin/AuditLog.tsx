'use client'

import { useEffect, useMemo, useState } from 'react'

interface Entry {
  id: string
  created_at: string
  actor_type: string | null
  actor_name: string | null
  action: string
  entity: string | null
  entity_id: string | null
  detail: string | null
  school: string | null
  ip: string | null
}

// Human-readable labels for the action codes.
const LABELS: Record<string, string> = {
  'login': 'Signed in',
  'student.create': 'Added student',
  'student.update': 'Edited student',
  'student.delete': 'Deleted student',
  'student.import': 'Imported students',
  'teacher.create': 'Added teacher',
  'teacher.update': 'Edited teacher',
  'teacher.delete': 'Deleted teacher',
  'settings.update': 'Changed settings',
  'reset.settings': 'Reset settings to defaults',
  'reset.clear_board': 'Cleared the board',
  'reset.delete_history': 'Deleted checkout history',
  'history.access': 'Viewed / exported history',
  'reports.access': 'Viewed reports',
}
const label = (a: string) => LABELS[a] ?? a

function tone(a: string) {
  if (a.startsWith('reset.') || a.endsWith('.delete')) return 'bad'
  if (a.endsWith('.access') || a === 'login') return 'view'
  return 'change'
}

export default function AuditLog({ token }: { token: string }) {
  const [rows, setRows] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [q, setQ] = useState('')

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/audit?limit=1000&ts=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const data = await res.json()
    if (Array.isArray(data)) setRows(data)
    setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  const actions = useMemo(() => Array.from(new Set(rows.map((r) => r.action))).sort(), [rows])
  const shown = rows.filter((r) => {
    if (filter && r.action !== filter) return false
    if (q.trim()) {
      const hay = `${r.actor_name ?? ''} ${label(r.action)} ${r.detail ?? ''} ${r.school ?? ''}`.toLowerCase()
      if (!hay.includes(q.trim().toLowerCase())) return false
    }
    return true
  })

  const exportCsv = () => {
    const header = 'When,Who,Role,Action,Detail,School,IP\n'
    const body = shown.map((r) => [
      new Date(r.created_at).toLocaleString(), r.actor_name ?? '', r.actor_type ?? '',
      label(r.action), r.detail ?? '', r.school ?? '', r.ip ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const input = 'rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-purple-700 focus:outline-none'

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
        <div className="flex gap-2">
          <button onClick={load} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Refresh</button>
          <button onClick={exportCsv} className="rounded-xl bg-purple-800 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-900">Export CSV</button>
        </div>
      </div>
      <p className="mb-5 text-sm text-gray-500">Who accessed or changed student data, and when. Kept in your own database — retained as long as you keep it (well beyond any 30-day requirement).</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, detail…" className={`${input} min-w-48 flex-1`} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={input}>
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{label(a)}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">When</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Who</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">Loading…</td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm italic text-gray-500">No matching events.</td></tr>
            ) : shown.map((r) => {
              const tn = tone(r.action)
              const cls = tn === 'bad' ? 'bg-red-100 text-red-700' : tn === 'view' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-500 tabular-nums">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5"><span className="font-medium text-gray-900">{r.actor_name ?? '—'}</span> <span className="text-xs text-gray-400">{r.actor_type}</span></td>
                  <td className="px-4 py-2.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label(r.action)}</span></td>
                  <td className="px-4 py-2.5 text-gray-600">{r.detail}{r.school ? <span className="ml-1 text-xs text-gray-400">· {r.school.toUpperCase()}</span> : null}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-500">Showing up to 1,000 most recent events. Use Export CSV for an offline/archived copy.</p>
    </div>
  )
}
