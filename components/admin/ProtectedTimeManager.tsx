'use client'

import { useEffect, useState } from 'react'
import { schoolLabel } from '@/lib/schools'
import { minutesToLabel, minutesToHHMM } from '@/lib/timeWindows'
import type { ProtectedTime } from '@/lib/types'

const COMMON_TZ = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix',
  'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
]

export default function ProtectedTimeManager({ token, school }: { token: string; school: string }) {
  const [windows, setWindows] = useState<ProtectedTime[]>([])
  const [tz, setTz] = useState('America/New_York')
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState('')
  const [start, setStart] = useState('08:00')
  const [end, setEnd] = useState('08:15')
  const [error, setError] = useState('')
  const [savedTz, setSavedTz] = useState(false)

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const load = async () => {
    setLoading(true)
    const [wRes, sRes] = await Promise.all([
      fetch(`/api/admin/protected-times?school=${school}&ts=${Date.now()}`, { headers: h, cache: 'no-store' }),
      fetch(`/api/admin/settings?school=${school}&ts=${Date.now()}`, { headers: h, cache: 'no-store' }),
    ])
    const w = await wRes.json()
    const s = await sRes.json()
    if (Array.isArray(w)) setWindows(w)
    if (Array.isArray(s)) { const t = s.find((x: any) => x.key === 'timezone'); if (t) setTz(t.value) }
    setLoading(false)
  }

  useEffect(() => { load() }, [school]) // eslint-disable-line

  const add = async () => {
    setError('')
    const res = await fetch('/api/admin/protected-times', {
      method: 'POST', headers: h, body: JSON.stringify({ school, label, start, end }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Could not add'); return }
    setLabel(''); load()
  }

  const remove = async (id: string) => {
    await fetch(`/api/admin/protected-times?id=${id}`, { method: 'DELETE', headers: h })
    load()
  }

  const toggle = async (w: ProtectedTime) => {
    await fetch('/api/admin/protected-times', { method: 'PUT', headers: h, body: JSON.stringify({ id: w.id, active: !w.active }) })
    load()
  }

  const saveTz = async (value: string) => {
    setTz(value); setSavedTz(false)
    await fetch('/api/admin/settings', { method: 'PUT', headers: h, body: JSON.stringify({ updates: [{ key: 'timezone', value }], school }) })
    setSavedTz(true); setTimeout(() => setSavedTz(false), 2500)
  }

  const input = 'rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none'

  return (
    <div>
      <h2 className="mb-1 text-2xl font-bold text-gray-900">Protected Time</h2>
      <p className="mb-6 text-sm text-gray-500">
        During these daily windows, students at <span className="font-semibold text-gray-900">{schoolLabel(school)}</span> can&apos;t
        check themselves out. Teachers can still issue passes for real needs.
      </p>

      {/* Timezone */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-purple-800">Timezone</h3>
        <p className="mb-3 text-xs text-gray-500">Used to know your school&apos;s local clock time. Set this once.</p>
        <div className="flex items-center gap-3">
          <select value={tz} onChange={(e) => saveTz(e.target.value)} className={input}>
            {COMMON_TZ.map((z) => <option key={z} value={z}>{z}</option>)}
            {!COMMON_TZ.includes(tz) && <option value={tz}>{tz}</option>}
          </select>
          {savedTz && <span className="text-sm font-semibold text-emerald-600">✓ Saved</span>}
        </div>
      </div>

      {/* Add window */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-800">Add a protected window</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Label (optional)</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Homeroom" className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Start</label>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={input} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">End</label>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
          </div>
          <button onClick={add} className="rounded-xl bg-purple-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-900">Add</button>
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      {/* Existing windows */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : windows.length === 0 ? (
          <p className="p-6 text-sm italic text-gray-500">No protected windows yet. Passes are available all day.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {windows.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className={`font-semibold ${w.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                    {minutesToLabel(w.start_minute)} – {minutesToLabel(w.end_minute)}
                  </p>
                  {w.label && <p className="text-xs text-gray-500">{w.label}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => toggle(w)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${w.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {w.active ? 'On' : 'Off'}
                  </button>
                  <button onClick={() => remove(w.id)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
