'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { nameMatches } from '@/lib/search'
import { SCHOOLS, schoolLabel } from '@/lib/schools'
import CheckoutPanel from '@/components/CheckoutPanel'
import type { Student, Teacher, Checkout } from '@/lib/types'

type View = 'home' | 'issue' | 'excuse' | 'feedback'

function mins(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

const svg = (children: React.ReactNode) => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)
const icons = {
  grad: svg(<><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c3 2.5 9 2.5 12 0v-5" /></>),
  board: svg(<><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>),
  ticket: svg(<><path d="M2 9a3 3 0 0 0 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 0 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v14" /></>),
  edit: svg(<><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" /></>),
  message: svg(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />),
  chart: svg(<><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></>),
  settings: svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>),
  logout: svg(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>),
}

export default function TeacherTools({ token, onLogout, initialSchool }: { token: string; onLogout: () => void; initialSchool?: string }) {
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<{ isAdmin: boolean; teacherId: string | null; name: string; school: string | null } | null>(null)
  const [view, setView] = useState<View>('home')
  const [adminSchool, setAdminSchool] = useState(initialSchool ?? 'hs')

  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [active, setActive] = useState<Checkout[]>([])
  const [, setTick] = useState(0)

  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState('')
  const [dest, setDest] = useState<{ mode: 'location' | 'teacher' | 'custom'; location?: string; teacherId?: string; reason?: string }>({ mode: 'location', location: 'Bathroom' })
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const [exStudentId, setExStudentId] = useState('')
  const [exKind, setExKind] = useState<'late' | 'kept'>('late')
  const [exReason, setExReason] = useState('')
  const [exMsg, setExMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const [fbType, setFbType] = useState<'issue' | 'request'>('issue')
  const [fbMessage, setFbMessage] = useState('')
  const [fbMsg, setFbMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Teachers are pinned to their own school; admins pick which school they're managing.
  const school = me ? (me.isAdmin ? adminSchool : (me.school ?? '')) : ''
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
      setMe(await r.json())
      setReady(true)
    })()
  }, [authHeaders])

  // Load the board whenever the effective school changes (teacher's own, or admin's pick).
  useEffect(() => { if (school) loadBoard(school) }, [school, loadBoard])

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
    setExMsg({ text: 'Excuse pass issued — the student can show it from “Show My Pass”', ok: true }); setExStudentId(''); setExReason(''); loadBoard(school)
  }

  const closePass = async (checkoutId: string, confirmArrival: boolean) => {
    await fetch('/api/teacher/pass', { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ checkoutId, confirmArrival }) })
    loadBoard(school)
  }

  const submitFeedback = async () => {
    if (!fbMessage.trim()) { setFbMsg({ text: 'Please enter a message', ok: false }); return }
    const res = await fetch('/api/teacher/feedback', { method: 'POST', headers: authHeaders, body: JSON.stringify({ type: fbType, message: fbMessage }) })
    const data = await res.json()
    if (!res.ok) { setFbMsg({ text: data.error ?? 'Failed to send', ok: false }); return }
    setFbMsg({ text: 'Sent to admin — thank you!', ok: true }); setFbMessage('')
  }

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-purple-800" /></div>
  }

  const isAdmin = !!me?.isAdmin
  const selName = students.find((s) => s.id === studentId)?.name
  const inputCls = 'w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none'

  const NavBtn = ({ id, label, icon }: { id: View; label: string; icon: React.ReactNode }) => (
    <button onClick={() => setView(id)}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${view === id ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:bg-white/70 hover:text-gray-900'}`}>
      {icon} {label}
    </button>
  )
  const linkCls = 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-white/70 hover:text-gray-900'

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col gap-1 border-r border-gray-300/70 bg-gray-200/70 p-4 backdrop-blur-xl md:min-h-screen md:w-64">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-3 px-1 pt-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">{icons.grad}</span>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-lg font-semibold leading-tight text-gray-900">{isAdmin ? 'Staff Tools' : 'Teacher Tools'}</h1>
            <p className="truncate text-xs text-gray-500">{me?.name} · {schoolLabel(school)}</p>
          </div>
        </div>

        {isAdmin && (
          <div className="mb-4 flex gap-1 rounded-lg bg-white/60 p-1">
            {SCHOOLS.map((s) => (
              <button key={s.id} onClick={() => setAdminSchool(s.id)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${adminSchool === s.id ? 'bg-white text-purple-800 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        <nav className="flex flex-col gap-1">
          <NavBtn id="home" label="Check Out & Board" icon={icons.board} />
          <NavBtn id="issue" label="Issue Pass" icon={icons.ticket} />
          <NavBtn id="excuse" label="Excuse Student" icon={icons.edit} />
          <NavBtn id="feedback" label="Report / Request" icon={icons.message} />
          <div className="my-3 h-px bg-gray-200" />
          <a href={`/reports?school=${school}`} className={linkCls}>{icons.chart} Reports</a>
          {isAdmin && (
            <a href="/admin" className={linkCls}>{icons.settings} Admin Panel</a>
          )}
        </nav>

        <button onClick={onLogout} className={`mt-auto ${linkCls}`}>{icons.logout} Log Out</button>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-4xl">
          {view === 'home' && (
            <>
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
                        {c.pass_type === 'teacher_issued' && <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-blue-500">Teacher pass</p>}
                        {c.pass_type === 'excuse' && <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-blue-500">Excuse pass</p>}
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

              <h2 className="mb-4 mt-8 text-2xl font-bold text-gray-900">Check Out a Student</h2>
              <div className="max-w-2xl">
                <CheckoutPanel students={students} teachers={teachers}
                  activeCheckouts={active} onCheckoutSuccess={() => loadBoard(school)} />
              </div>
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
                {['Bathroom', 'Office', 'Nurse', 'Counselor'].map((l) => (
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
              <p className="mt-3 text-xs text-gray-500">Issues a pass the student can show their next teacher (via “Show My Pass”). It appears on the board and in reports, and doesn&apos;t count against bathroom limits.</p>
            </div>
          )}

          {view === 'feedback' && (
            <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-2xl font-bold text-gray-900">Report an Issue / Request a Change</h2>
              <p className="mb-5 text-sm text-gray-500">Your message goes straight to the admin&apos;s Requests panel.</p>
              <div className="mb-4 flex gap-2">
                <button onClick={() => setFbType('issue')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${fbType === 'issue' ? 'bg-purple-800 text-white' : 'border border-gray-300 text-gray-700'}`}>⚠ Report an issue</button>
                <button onClick={() => setFbType('request')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${fbType === 'request' ? 'bg-purple-800 text-white' : 'border border-gray-300 text-gray-700'}`}>💡 Request a change</button>
              </div>
              <textarea value={fbMessage} onChange={(e) => setFbMessage(e.target.value)} rows={5}
                placeholder="Describe the issue or the change you'd like…"
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-purple-700 focus:outline-none" />
              <button onClick={submitFeedback} className="mt-4 w-full rounded-2xl bg-purple-800 py-3.5 text-base font-bold text-white hover:bg-purple-900">Send to Admin</button>
              {fbMsg && <p className={`mt-2 text-sm font-medium ${fbMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{fbMsg.text}</p>}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
