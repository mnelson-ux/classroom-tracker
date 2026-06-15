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
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59)
      params.set('to', end.toISOString())
    }
    if (studentId) params.set('studentId', studentId)

    const res = await fetch(`/api/admin/history?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setRecords(data)
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const exportCsv = () => {
    const header = 'Student,Gender,Teacher,Room,Location,Check-Out,Check-In,Duration (min)\n'
    const rows = records.map((r) => {
      const s = r.student as any
      const t = r.teacher as any
      const room = r.room as any
      return [
        s?.name ?? '', s?.gender ?? '', t?.name ?? '', room?.name ?? '',
        r.location,
        new Date(r.check_out_time).toLocaleString(),
        r.check_in_time ? new Date(r.check_in_time).toLocaleString() : '',
        r.duration_minutes ?? '',
      ].map((v) => `"${v}"`).join(',')
    }).join('\n')

    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `checkout-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">History</h2>
        <button onClick={exportCsv} className="rounded-lg bg-forest-600/50 px-4 py-2 text-sm font-bold text-white hover:bg-forest-600">
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div>
          <label className="mb-1 block text-xs text-white/60">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:border-forest-300" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/60">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:border-forest-300" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/60">Student</label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="rounded-lg border border-white/20 bg-forest-800 px-3 py-2 text-white focus:outline-none">
            <option value="">All students</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={load} disabled={loading} className="rounded-lg bg-forest-500 px-5 py-2 font-bold text-white hover:bg-forest-600 disabled:opacity-50">
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/20">
        <table className="w-full text-sm">
          <thead className="border-b border-white/20 bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left font-bold">Student</th>
              <th className="px-4 py-3 text-left font-bold">Teacher</th>
              <th className="px-4 py-3 text-left font-bold">Location</th>
              <th className="px-4 py-3 text-left font-bold">Checked Out</th>
              <th className="px-4 py-3 text-left font-bold">Checked In</th>
              <th className="px-4 py-3 text-left font-bold">Duration</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const s = r.student as any
              const t = r.teacher as any
              const mins = r.duration_minutes ?? 0
              const isLong = mins >= 10
              return (
                <tr key={r.id} className={`border-b border-white/10 ${isLong ? 'bg-yellow-400/5' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{s?.name ?? '—'}</div>
                    <div className="text-xs text-white/50 capitalize">{s?.gender}</div>
                  </td>
                  <td className="px-4 py-3 text-white/70">{t?.name ?? '—'}</td>
                  <td className="px-4 py-3">{r.location}</td>
                  <td className="px-4 py-3 text-white/70">{fmt(r.check_out_time)}</td>
                  <td className="px-4 py-3 text-white/70">{r.check_in_time ? fmt(r.check_in_time) : '—'}</td>
                  <td className={`px-4 py-3 font-bold ${isLong ? 'text-yellow-300' : 'text-white'}`}>
                    {mins} min
                  </td>
                </tr>
              )
            })}
            {records.length === 0 && !loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center italic text-white/40">No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-white/40">Showing up to 500 most recent records</p>
    </div>
  )
}
