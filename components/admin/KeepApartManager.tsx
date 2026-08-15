'use client'

import { useEffect, useMemo, useState } from 'react'
import { schoolLabel } from '@/lib/schools'
import type { Student } from '@/lib/types'

interface Pair {
  id: string
  a: { id: string; name: string } | null
  b: { id: string; name: string } | null
}

export default function KeepApartManager({ students, token, school }: { students: Student[]; token: string; school: string }) {
  const [pairs, setPairs] = useState<Pair[]>([])
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const sorted = useMemo(() => [...students].sort((x, y) => x.name.localeCompare(y.name)), [students])

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/keep-apart?school=${school}&ts=${Date.now()}`, { headers: h, cache: 'no-store' })
    const data = await res.json()
    if (Array.isArray(data)) setPairs(data)
    setLoading(false)
  }
  useEffect(() => { load(); setA(''); setB('') }, [school]) // eslint-disable-line

  const add = async () => {
    setError('')
    const res = await fetch('/api/admin/keep-apart', { method: 'POST', headers: h, body: JSON.stringify({ school, studentA: a, studentB: b }) })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Could not add'); return }
    setA(''); setB(''); load()
  }

  const remove = async (id: string) => {
    await fetch(`/api/admin/keep-apart?id=${id}`, { method: 'DELETE', headers: h })
    load()
  }

  const select = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none'

  return (
    <div>
      <h2 className="mb-1 text-2xl font-bold text-gray-900">Keep Apart</h2>
      <p className="mb-6 text-sm text-gray-500">
        Stop two students at <span className="font-semibold text-gray-900">{schoolLabel(school)}</span> from being out at the
        same time. If one is checked out anywhere, the other can&apos;t check themselves out until the first returns.
      </p>

      {/* Add a pair */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-800">Add a keep-apart pair</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Student A</label>
            <select value={a} onChange={(e) => setA(e.target.value)} className={select}>
              <option value="">Choose a student…</option>
              {sorted.map((s) => <option key={s.id} value={s.id} disabled={s.id === b}>{s.name}</option>)}
            </select>
          </div>
          <div className="hidden pb-2.5 text-center text-sm font-bold text-gray-400 sm:block">✕</div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Student B</label>
            <select value={b} onChange={(e) => setB(e.target.value)} className={select}>
              <option value="">Choose a student…</option>
              {sorted.map((s) => <option key={s.id} value={s.id} disabled={s.id === a}>{s.name}</option>)}
            </select>
          </div>
          <button onClick={add} disabled={!a || !b}
            className="rounded-xl bg-purple-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-900 disabled:opacity-40">Add pair</button>
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      {/* Existing pairs */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : pairs.length === 0 ? (
          <p className="p-6 text-sm italic text-gray-500">No keep-apart pairs yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pairs.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-gray-900">{p.a?.name ?? 'Unknown'}</span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">keep apart</span>
                  <span className="font-semibold text-gray-900">{p.b?.name ?? 'Unknown'}</span>
                </div>
                <button onClick={() => remove(p.id)} className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
