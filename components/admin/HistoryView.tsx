'use client'

import { useState, useEffect } from 'react'
import type { Checkout, Student } from '@/lib/types'

interface Props {
  token: string
  students: Student[]
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function HistoryView({ token, students }: Props) {
  const [records, setRecords] = useState<Checkout[]>([])
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [studentId, setStudentId] = useState('')

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (dateFrom) params.set('from', new Date(dateFrom).toISOString())
    if (dateTo) { const end = new Date(dateTo); end.setHours(23, 59, 59); params.set('to', end.toISOString()) }
    if (studentId) params.set('studentId', studentId)
    const res = await fetch(`/api/admin/history?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setRecords(data)
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const exportCsv = () => {
    const header = 'Student,Gender,Teacher,Room,Location,Check-Out,Check-In,Duration (min)\n'
    const rows = records.map((r) => {
      const s = r.student as any; const t = r.teacher as any; const room = r.room as any
      return [s?.name ?? '', s?.gender ?? '', t?.name ?? '', room?.name ?? '', r.location,
        new Date(r.check_out_time).toLocaleString(),
        r.check_in_time ? new Date(r.check_in_time).toLocaleString() : '',
        r.duration_minutes ?? ''].map((v) => `"${v}"`).join(',')
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `checkout-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const inputCls = 'rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">History</h2>
        <button onClick={exportCsv} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Student</label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputCls}>
            <option value="">All students</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={load} disabled={loading}
            className="rounded-xl bg-purple-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-900 disabled:opacity-40">
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {['Student', 'Teacher', 'Location', 'Checked Out', 'Checked In', 'Duration'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {records.map((r) => {
              const s = r.student as any; const t = r.teacher as any
              const mins = r.duration_minutes ?? 0
              const isLong = mins >= 10
              return (
                <tr key={r.id} className={`transition hover:bg-gray-50 ${isLong ? 'bg-amber-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s?.name ?? '—'}</p>
                    <p className="text-xs capitalize text-gray-500">{s?.gender}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-900">{r.location}</td>
                  <td className="px-4 py-3 text-gray-500">{fmt(r.check_out_time)}</td>
                  <td className="px-4 py-3 text-gray-500">{r.check_in_time ? fmt(r.check_in_time) : '—'}</td>
                  <td className={`px-4 py-3 font-bold ${isLong ? 'text-amber-600' : 'text-gray-900'}`}>{mins} min</td>
                </tr>
              )
            })}
            {records.length === 0 && !loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm italic text-gray-500">No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-500">Showing up to 500 most recent records</p>
    </div>
  )
}
