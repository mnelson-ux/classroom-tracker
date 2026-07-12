'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { nameMatches } from '@/lib/search'
import { schoolLabel } from '@/lib/schools'
import CheckoutForm from '@/components/CheckoutForm'
import GreenScreen from '@/components/GreenScreen'
import type { Student, Teacher, Checkout } from '@/lib/types'

type View = 'home' | 'issue' | 'excuse'

function mins(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

export default function TeacherTools({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<{ isAdmin: boolean; teacherId: string | null; name: string; school: string | null } | null>(null)
  const [view, setView] = useState<View>('home')

  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [active, setActive] = useState<Checkout[]>([])
  const [greenScreen, setGreenScreen] = useState<{ checkout: Checkout; student: Student } | null>(null)
  const [, setTick] = useState(0)

  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState('')
  const [dest, setDest] = useState<{ mode: 'location' | 'teacher' | 'custom'; location?: string; teacherId?: string; reason?: string }>({ mode: 'location', location: 'Bathroom' })
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const [exStudentId, setExStudentId] = useState('')
  const [exKind, setExKind] = useState<'late' | 'kept'>('late')
  const [exReason, setExReason] = useState('')
  const [exMsg, setExMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const school = me?.school ?? ''
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
    ;(async () => {
      const r = await fetch('/api/teacher/me', { headers: authHeaders, cache: 'no-store' })
      if (!r.ok) { setReady(true); return }
      const data = await r.json()
      setMe(data)
      if (data.school) await loadBoard(data.school)
      setReady(true)
    })()
  }, [authHeaders, loadBoard])

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
      reason = dest.reason.trim(); location = dest.reason.trim()
    }
    const res = await fetch('/api/teacher/pass', { method: 'POST', headers: authHeaders, body: JSON.stringify({ studentId, location, destinationTeacherId, reason }) })
    const data = await res.json()
    if (!res.ok) { setMsg({ text: data.error ?? 'Failed', ok: false }); return }
    setMsg({ text: 'Pass issued', ok: true }); setStudentId(''); setSearch(''); loadBoard(school)
  }

  const logExcuse = async () => {
    if (!exStudentId) { setExMsg({ text: 'Choose a student first', ok: false }); return }
    const res = await fetch('/api/teacher/excuse', { method: 'POST', headers: authHeaders, body: JSON.stringify({ studentId: exStudentId, kind: exKind, reason: exReason.trim() }) })
    const data = await res.json()
    if (!res.ok) { setExMsg({ text: data.error ?? 'Failed', ok: false }); return }
    setExMsg({ text: 'Excuse logged', ok: true }); setExStudentId(''); setExReason('')
  }

  const closePass = async (checkoutId: string, confirmArrival: boolean) => {
    await fetch('/api/teacher/pass', { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ checkoutId, confirmArrival }) })
    loadBoard(school)
  }

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-purple-800" /></div>
  }

  if (me && me.isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Teacher Tools</h1>
        <p className="max-w-md text-gray-500">You&apos;re signed in as an admin. Teacher Tools are for teacher accounts — sign in as a teacher to issue passes and excuses.</p>
        <button onClick={onLogout} className="rounded-xl bg-purple-800 px-6 py-3 font-semibold text-white hover:bg-purple-900">Log out</button>
      </div>
    )
  }

  const selName = students.find((s) => s.id === studentId)?.name
  const inputCls = 'w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none'

  const NavBtn = ({ id, label, icon }: { id: View; label: string; icon: string }) => (
    <button onClick={() => setView(id)}
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${view === id ? 'bg-white/20 text-white' : 'text-purple-100 hover:bg-white/10'}`}>
      <span className="text-base">{icon}</span> {label}
    </button>
  )

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      <aside className="flex flex-col gap-1 bg-purple-800 p-4 md:min-h-screen md:w-64">
        <div className="mb-4 border-b border-white/15 pb-4">
          <h1 className="text-lg font-bold text-white">Teacher Tools</h1>
          <p className="text-sm text-amber-400">{me?.name}</p>
          <p className="text-xs text-purple-200">{schoolLabel(school)}</p>
        </div>
        <NavBtn id="home" label="Check Out & Board" icon="🏠" />
        <NavBtn id="issue" label="Issue Pass" icon="🎫" />
        <NavBtn id="excuse" label="Excuse Student" icon="✏️" />
        <div className="my-3 border-t border-white/15" />
        <a href={`/reports?school=${school}`} className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-purple-100 transition hover:bg-white/10">📊 Reports</a>
        <button onClick={onLogout} className="mt-1 flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-purple-100 transition hover:bg-white/10">🚪 Log Out</button>
      </aside>

      {greenScreen && (
        <GreenScreen checkout={greenScreen.checkout} student={greenScreen.student}
          teacher={teachers.find((t) => t.id === greenScreen.checkout.teacher_id)}
          onCheckedIn={() => { setGreenScreen(null); loadBoard(school) }} />
      )}

      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-4xl">
          {view === 'home' && (
            <>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">Check Out a Student</h2>
              <div className="mb-8 grid gap-6 md:grid-cols-2">
                <CheckoutForm gender="female" title="Girls" students={students} teachers={teachers}
                  activeCheckouts={active} onCheckoutSuccess={(co, st) => setGreenScreen({ checkout: co, student: st })} />
                <CheckoutForm gender="male" title="Boys" students={students} teachers={teachers}
                  activeCheckouts={active} onCheckoutSuccess={(co, st) => setGreenScreen({ checkout: co, student: st })} />
              </div>

              <h2 className="mb-4 text-2xl font-bold text-gray-900">Currently Out <span className="text-base font-normal text-gray-400">({active.length})</span></h2>
              {active.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                  <div className="text-3xl text-gray-300">✓</div>
                  <p className="mt-2 text-sm text-gray-500">No students are out right now.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {active.map((c) => {
                    const out = mins(c.check_out_time)
                    const color = out >= 10 ? 'border-red-300 bg-red-50' : out >= 6 ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
                    const s: any = c.student
                    return (
                      <div key={c.id} className={`rounded-2xl border p-4 shadow-sm ${color}`}>
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900">{s?.name ?? 'Student'}</p>
                            <p className="truncate text-xs text-purple-700">{c.location}</p>
                          </div>
                          <span className="ml-2 shrink-0 text-sm font-bold tabular-nums text-gray-700">{out}m</span>
                        </div>
                        {c.pass_type === 'teacher_issued' && <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-purple-500">Teacher pass</p>}
                        <div className="mt-3">
                          {c.destination_teacher_id ? (
                            <button onClick={() => closePass(c.id, true)} className="w-full rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Confirm arrival</button>
                          ) : (
                            <button onClick={() => closePass(c.id, false)} className="w-full rounded-lg bg-purple-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-900">Check in</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {view === 'issue' && (
            <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-2xl font-bold text-gray-900">Issue a Hall Pass</h2>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Student</label>
              {studentId ? (
                <div className="mb-4 flex items-center justify-between rounded-xl bg-purple-50 px-4 py-2.5">
                  <span className="text-sm font-medium text-purple-900">{selName}</span>
                  <button onClick={() => { setStudentId(''); setSearch('') }} className="text-xs font-semibold text-purple-700 underline">change</button>
                </div>
              ) : (
                <div className="mb-4">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student…" className={inputCls} />
                  {search.trim() && (
                    <div className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                      {filteredStudents.slice(0, 40).map((s) => (
                        <button key={s.id} onClick={() => { setStudentId(s.id); setSearch('') }} className="block w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-purple-50">{s.name}</button>
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
                <button onClick={() => setDest({ mode: 'teacher' })} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${dest.mode === 'teacher' ? 'bg-purple-800 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Another teacher</button>
                <button onClick={() => setDest({ mode: 'custom' })} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${dest.mode === 'custom' ? 'bg-purple-800 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Custom</button>
              </div>
              {dest.mode === 'teacher' && (
                <select value={dest.teacherId ?? ''} onChange={(e) => setDest({ mode: 'teacher', teacherId: e.target.value })} className={`mb-4 ${inputCls}`}>
                  <option value="">Choose a teacher</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
              {dest.mode === 'custom' && (
                <input value={dest.reason ?? ''} onChange={(e) => setDest({ mode: 'custom', reason: e.target.value })} placeholder="Reason (e.g. Counselor, Locker)" className={`mb-4 ${inputCls}`} />
              )}

              <button onClick={issuePass} className="mt-2 w-full rounded-2xl bg-purple-800 py-3.5 text-base font-bold text-white hover:bg-purple-900">Issue Pass</button>
              {msg && <p className={`mt-2 text-sm font-medium ${msg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{msg.text}</p>}
            </div>
          )}

          {view === 'excuse' && (
            <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-2xl font-bold text-gray-900">Excuse a Student</h2>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Student</label>
              <select value={exStudentId} onChange={(e) => setExStudentId(e.target.value)} className={`mb-4 ${inputCls}`}>
                <option value="">Choose a student</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Reason</label>
              <div className="mb-4 flex gap-2">
                <button onClick={() => setExKind('late')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${exKind === 'late' ? 'bg-purple-800 text-white' : 'border border-gray-300 text-gray-700'}`}>Late arrival</button>
                <button onClick={() => setExKind('kept')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${exKind === 'kept' ? 'bg-purple-800 text-white' : 'border border-gray-300 text-gray-700'}`}>Kept after class</button>
              </div>
              <input value={exReason} onChange={(e) => setExReason(e.target.value)} placeholder="Optional note" className={`mb-4 ${inputCls}`} />
              <button onClick={logExcuse} className="w-full rounded-2xl bg-purple-800 py-3.5 text-base font-bold text-white hover:bg-purple-900">Log Excuse</button>
              {exMsg && <p className={`mt-2 text-sm font-medium ${exMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{exMsg.text}</p>}
              <p className="mt-3 text-xs text-gray-500">Excuses are documented in reports and history. They don&apos;t count against bathroom limits.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
