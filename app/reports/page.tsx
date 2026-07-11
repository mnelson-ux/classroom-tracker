'use client'

import { Fragment, useEffect, useState } from 'react'
import { SCHOOLS, isSchool } from '@/lib/schools'
import { nameMatches } from '@/lib/search'
import type { AuthState } from '@/lib/types'

interface Bucket { trips: number; minutes: number }
type PeriodStats = Record<string, Bucket>
interface StudentAgg { student_name: string; week: PeriodStats; month: PeriodStats; all: PeriodStats }
interface TeacherAgg {
  teacher_id: string
  teacher_name: string
  week: PeriodStats; month: PeriodStats; all: PeriodStats
  students: StudentAgg[]
}

const EMPTY: Bucket = { trips: 0, minutes: 0 }

function Cell({ stats, loc }: { stats: PeriodStats; loc: string }) {
  const b = stats[loc] ?? EMPTY
  return (
    <td className="px-4 py-3 text-center">
      <span className="font-semibold text-gray-900">{b.trips}</span>
      <span className="text-gray-400"> trip{b.trips !== 1 ? 's' : ''}</span>
      <span className="block text-xs text-gray-500">{b.minutes} min</span>
    </td>
  )
}

export default function ReportsPage() {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [checking, setChecking] = useState(true)
  const [teachers, setTeachers] = useState<TeacherAgg[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [loc, setLoc] = useState('Total')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [school, setSchool] = useState('hs')
  const [studentSearch, setStudentSearch] = useState('')

  useEffect(() => {
    // Default the school from the ?school= param the site link passes in.
    try {
      const p = new URLSearchParams(window.location.search).get('school')
      if (isSchool(p)) setSchool(p)
    } catch {}
    try {
      const stored = localStorage.getItem('auth')
      if (stored) {
        const parsed: AuthState = JSON.parse(stored)
        if (parsed.isAuthenticated && parsed.token) { setAuth(parsed); setChecking(false); return }
      }
    } catch {}
    window.location.href = '/'
  }, [])

  useEffect(() => {
    if (!auth?.token) return
    setLoading(true)
    fetch(`/api/reports?school=${school}&ts=${Date.now()}`, { headers: { Authorization: `Bearer ${auth.token}` }, cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.teachers)) setTeachers(d.teachers)
        if (Array.isArray(d.locations)) setLocations(d.locations)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [auth, school])

  if (checking || !auth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-purple-800" />
      </div>
    )
  }

  // Always show the standard locations, plus any others that appear in the data.
  const STANDARD = ['Bathroom', 'Office', 'Nurse']
  const tabs = ['Total', ...STANDARD, ...locations.filter((l) => !STANDARD.includes(l))]

  // When searching for a student, filter each teacher's students and hide teachers with no match.
  const searching = studentSearch.trim().length > 0
  const visibleTeachers = teachers
    .map((t) => ({ ...t, students: searching ? t.students.filter((s) => nameMatches(s.student_name, studentSearch)) : t.students }))
    .filter((t) => !searching || t.students.length > 0)

  // Grand total across all visible teachers for the selected location, per period.
  const totalFor = (get: (t: TeacherAgg) => PeriodStats): PeriodStats => {
    const b = visibleTeachers.reduce(
      (acc, t) => {
        const x = get(t)[loc] ?? EMPTY
        return { trips: acc.trips + x.trips, minutes: acc.minutes + x.minutes }
      },
      { trips: 0, minutes: 0 },
    )
    return { [loc]: b }
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500">Checkout activity by teacher</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex gap-1 rounded-xl bg-gray-100 p-1">
              {SCHOOLS.map((s) => (
                <button key={s.id} onClick={() => setSchool(s.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${school === s.id ? 'bg-white text-purple-800 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <a href={`/${school}`} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50">
              Back to App
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Location filter + student search */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm">
            {tabs.map((l) => (
              <button
                key={l}
                onClick={() => setLoc(l)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  loc === l ? 'bg-purple-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search a student…"
            className="w-full max-w-xs rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-700/20"
          />
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : teachers.length === 0 ? (
          <p className="text-sm italic text-gray-500">No checkout data yet.</p>
        ) : visibleTeachers.length === 0 ? (
          <p className="text-sm italic text-gray-500">No students match “{studentSearch}”.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Teacher <span className="font-normal normal-case text-gray-400">· {loc}</span>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">This Week</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">This Month</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">All Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleTeachers.map((t) => (
                  <Fragment key={t.teacher_id}>
                    <tr className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpanded((e) => ({ ...e, [t.teacher_id]: !e[t.teacher_id] }))}>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        <span className="mr-2 inline-block text-gray-400">{(searching || expanded[t.teacher_id]) ? '▾' : '▸'}</span>
                        {t.teacher_name}
                      </td>
                      <Cell stats={t.week} loc={loc} />
                      <Cell stats={t.month} loc={loc} />
                      <Cell stats={t.all} loc={loc} />
                    </tr>
                    {(searching || expanded[t.teacher_id]) && t.students.map((s) => (
                      <tr key={`${t.teacher_id}-${s.student_name}`} className="bg-gray-50/50">
                        <td className="py-2 pl-12 pr-4 text-gray-700">{s.student_name}</td>
                        <Cell stats={s.week} loc={loc} />
                        <Cell stats={s.month} loc={loc} />
                        <Cell stats={s.all} loc={loc} />
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-300 bg-purple-50">
                <tr>
                  <td className="px-4 py-3 font-bold text-purple-900">
                    {searching ? 'Total (matching students)' : 'All Teachers'}
                    <span className="font-normal normal-case text-purple-400"> · {loc}</span>
                  </td>
                  <Cell stats={totalFor((t) => t.week)} loc={loc} />
                  <Cell stats={totalFor((t) => t.month)} loc={loc} />
                  <Cell stats={totalFor((t) => t.all)} loc={loc} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-gray-500">
          Use the buttons above to filter by location. Tap a teacher row to see the per-student breakdown.
          &quot;This Week&quot; starts Sunday; &quot;This Month&quot; starts the 1st.
        </p>
      </div>
    </div>
  )
}
