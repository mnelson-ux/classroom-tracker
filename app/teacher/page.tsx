'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import LoginModal from '@/components/LoginModal'
import { nameMatches } from '@/lib/search'
import { schoolLabel } from '@/lib/schools'
import type { AuthState, Student, Teacher, Checkout } from '@/lib/types'

function mins(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

export default function TeacherPage() {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<{ isAdmin: boolean; teacherId: string | null; name: string; school: string | null } | null>(null)

  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [active, setActive] = useState<Checkout[]>([])
  const [, setTick] = useState(0)

  // Issue-pass form
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState('')
  const [dest, setDest] = useState<{ mode: 'location' | 'teacher' | 'custom'; location?: string; teacherId?: string; reason?: string }>({ mode: 'location', location: 'Bathroom' })
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Excuse form
  const [exStudentId, setExStudentId] = useState('')
  const [exKind, setExKind] = useState<'late' | 'kept'>('late')
  const [exReason, setExReason] = useState('')
  const [exMsg, setExMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const school = me?.school ?? ''
  const token = auth?.token

  const authHeaders = useMemo(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token])

  const loadBoard = useCallback(async (sc: string) => {
    const [sRes, tRes, cRes] = await Promise.all([
      fetch(`/api/students?school=${sc}&ts=${Date.now()}`, { cache: 'no-store' }),
      fetch(`/api/teachers?school=${sc}&ts=${Date.now()}`, { cache: 'no-store' }),
      fetch(`/api/checkouts?school=${sc}&ts=${Date.now()}`, { cache: 'no-store' }),
    ])
    const [s, t, c] = await Promise.all([sRes.json(), tRes.json(), cRes.json()])
    if (Array.isArray(s)) setStudents(s)
    if (Array.isArray(t)) setTeachers(t)
    if (Array.isArray(c)) setActive(c)
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth')
      if (stored) {
        const parsed: AuthState = JSON.parse(stored)
        if (parsed.isAuthenticated && parsed.token) { setAuth(parsed); return }
      }
    } catch {}
    setReady(true)
  }, [])

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const r = await fetch('/api/teacher/me', { headers: authHeaders, cache: 'no-store' })
      if (!r.ok) { setReady(true); return }
      const data = await r.json()
      setMe(data)
      if (data.school) await loadBoard(data.school)
      setReady(true)
    })()
  }, [token, authHeaders, loadBoard])

  // live timers + periodic refresh
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    const poll = setInterval(() => { if (school) loadBoard(school) }, 20000)
    return () => { clearInterval(id); clearInterval(poll) }
  }, [school, loadBoard])

  const filteredStudents = useMemo(() => {
    const q = search.trim()
    return students.filter((s) => !q || nameMatches(s.name, q))
  }, [students, search])

  const issuePass = async () => {
    if (!studentId) { setMsg({ text: 'Choose a student first', ok: false }); return }
    let location = ''
    let destinationTeacherId: string | undefined
    let reason: string | undefined
    if (dest.mode === 'location') location = dest.location ?? 'Bathroom'
    else if (dest.mode === 'teacher') {
      if (!dest.teacherId) { setMsg({ text: 'Pick a teacher', ok: false }); return }
      destinationTeacherId = dest.teacherId
      location = teachers.find((t) => t.id === dest.teacherId)?.name ?? 'Another class'
    } else {
      if (!dest.reason?.trim()) { setMsg({ text: 'Enter a reason', ok: false }); return }
      reason = dest.reason.trim()
      location = dest.reason.trim()
    }
    const res = await fetch('/api/teacher/pass', {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ studentId, location, destinationTeacherId, reason }),
    })
    const data = await res.json()
    if (!res.ok) { setMsg({ text: data.error ?? 'Failed', ok: false }); return }
    setMsg({ text: 'Pass issued', ok: true })
    setStudentId(''); setSearch('')
    loadBoard(school)
  }

  const logExcuse = async () => {
    if (!exStudentId) { setExMsg({ text: 'Choose a student first', ok: false }); return }
    const res = await fetch('/api/teacher/excuse', {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ studentId: exStudentId, kind: exKind, reason: exReason.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setExMsg({ text: data.error ?? 'Failed', ok: false }); return }
    setExMsg({ text: 'Excuse logged', ok: true })
    setExStudentId(''); setExReason('')
  }

  const closePass = async (checkoutId: string, confirmArrival: boolean) => {
    await fetch('/api/teacher/pass', { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ checkoutId, confirmArrival }) })
    loadBoard(school)
  }

  const handleLogout = async () => {
    if (token) await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    localStorage.removeItem('auth'); setAuth(null); setMe(null)
  }

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-purple-800" /></div>
  }

  if (!auth?.isAuthenticated) {
    return (
      <>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Teacher Tools</h1>
          <p className="text-gray-500">Sign in with your teacher account to issue passes.</p>
        </div>
        <LoginModal onSuccess={(a) => setAuth(a)} onClose={() => (window.location.href = '/')} />
      </>
    )
  }

  if (me && me.isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Teacher Tools</h1>
        <p className="max-w-md text-gray-500">You&apos;re signed in as an admin. Teacher Tools are for teacher accounts — sign in as a teacher to issue passes and excuses.</p>
        <button onClick={handleLogout} className="rounded-xl bg-purple-800 px-6 py-3 font-semibold text-white hover:bg-purple-900">Log out</button>
      </div>
    )
  }

  const selName = students.find((s) => s.id === studentId)?.name

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-purple-800 shadow">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-white">Teacher Tools</h1>
            <p className="text-sm text-amber-400">{me?.name} · {schoolLabel(school)}</p>
          </div>
          <div className="flex gap-2">
            <a href={`/${school}`} className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Kiosk</a>
            <button onClick={handleLogout} className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Log Out</button>
          </div>
        </div>
        <div className="h-1 w-full bg-amber-400" />
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Issue a pass */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Issue a Hall Pass</h2>

            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Student</label>
            {studentId ? (
              <div className="mb-3 flex items-center justify-between rounded-xl bg-purple-50 px-4 py-2.5">
                <span className="text-sm font-medium text-purple-900">{selName}</span>
                <button onClick={() => { setStudentId(''); setSearch('') }} className="text-xs font-semibold text-purple-700 underline">change</button>
              </div>
            ) : (
              <div className="mb-3">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student…"
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none" />
                {search.trim() && (
                  <div className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                    {filteredStudents.slice(0, 40).map((s) => (
                      <button key={s.id} onClick={() => { setStudentId(s.id); setSearch('') }}
                        className="block w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-purple-50">{s.name}</button>
                    ))}
                    {filteredStudents.length === 0 && <p className="px-4 py-2 text-sm text-gray-400">No match</p>}
                  </div>
                )}
              </div>
            )}

            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Destination</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {['Bathroom', 'Office', 'Nurse'].map((l) => (
                <button key={l} onClick={() => setDest({ mode: 'location', location: l })}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${dest.mode === 'location' && dest.location === l ? 'bg-purple-800 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{l}</button>
              ))}
              <button onClick={() => setDest({ mode: 'teacher' })}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${dest.mode === 'teacher' ? 'bg-purple-800 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Another teacher</button>
              <button onClick={() => setDest({ mode: 'custom' })}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${dest.mode === 'custom' ? 'bg-purple-800 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Custom</button>
            </div>
            {dest.mode === 'teacher' && (
              <select value={dest.teacherId ?? ''} onChange={(e) => setDest({ mode: 'teacher', teacherId: e.target.value })}
                className="mb-3 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none">
                <option value="">Choose a teacher</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
            {dest.mode === 'custom' && (
              <input value={dest.reason ?? ''} onChange={(e) => setDest({ mode: 'custom', reason: e.target.value })}
                placeholder="Reason (e.g. Counselor, Locker)" className="mb-3 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none" />
            )}

            <button onClick={issuePass} className="mt-2 w-full rounded-xl bg-purple-800 py-3 text-sm font-bold text-white hover:bg-purple-900">Issue Pass</button>
            {msg && <p className={`mt-2 text-sm font-medium ${msg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{msg.text}</p>}
          </div>

          {/* Excuse */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Excuse a Student</h2>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Student</label>
            <select value={exStudentId} onChange={(e) => setExStudentId(e.target.value)}
              className="mb-3 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none">
              <option value="">Choose a student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Reason</label>
            <div className="mb-3 flex gap-2">
              <button onClick={() => setExKind('late')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${exKind === 'late' ? 'bg-purple-800 text-white' : 'border border-gray-300 text-gray-700'}`}>Late arrival</button>
              <button onClick={() => setExKind('kept')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${exKind === 'kept' ? 'bg-purple-800 text-white' : 'border border-gray-300 text-gray-700'}`}>Kept after class</button>
            </div>
            <input value={exReason} onChange={(e) => setExReason(e.target.value)} placeholder="Optional note"
              className="mb-3 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:outline-none" />
            <button onClick={logExcuse} className="w-full rounded-xl bg-purple-800 py-3 text-sm font-bold text-white hover:bg-purple-900">Log Excuse</button>
            {exMsg && <p className={`mt-2 text-sm font-medium ${exMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{exMsg.text}</p>}
            <p className="mt-3 text-xs text-gray-500">Excuses are documented in reports and history. They don&apos;t count against bathroom limits.</p>
          </div>
        </div>

        {/* Currently out */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Currently Out <span className="text-sm font-normal text-gray-400">({active.length})</span></h2>
          {active.length === 0 ? (
            <p className="text-sm italic text-gray-500">No students are out right now.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {active.map((c) => {
                const out = mins(c.check_out_time)
                const color = out >= 10 ? 'border-red-300 bg-red-50' : out >= 6 ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'
                const s: any = c.student
                return (
                  <div key={c.id} className={`rounded-xl border p-4 ${color}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{s?.name ?? 'Student'}</p>
                        <p className="text-xs text-purple-700">{c.location}</p>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-gray-700">{out}m</span>
                    </div>
                    {c.pass_type === 'teacher_issued' && <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-purple-500">Teacher pass</p>}
                    <div className="mt-3 flex gap-2">
                      {c.destination_teacher_id ? (
                        <button onClick={() => closePass(c.id, true)} className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Confirm arrival</button>
                      ) : (
                        <button onClick={() => closePass(c.id, false)} className="flex-1 rounded-lg bg-purple-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-900">Check in</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
