'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { nameMatches } from '@/lib/search'
import { SCHOOLS, schoolLabel } from '@/lib/schools'
import CheckoutPanel from '@/components/CheckoutPanel'
import QueuePanel from '@/components/QueuePanel'
import NursePass from '@/components/NursePass'
import type { Student, Teacher, Checkout, QueueEntry } from '@/lib/types'

type View = 'home' | 'today' | 'issue' | 'excuse' | 'feedback'

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
  key: svg(<><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.5 12.5 8-8" /><path d="m17 4 3 3" /><path d="m14 7 3 3" /></>),
  today: svg(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
}

export default function TeacherTools({ token, onLogout, initialSchool }: { token: string; onLogout: () => void; initialSchool?: string }) {
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState<{ isAdmin: boolean; teacherId: string | null; name: string; school: string | null } | null>(null)
  const [view, setView] = useState<View>('home')
  const [adminSchool, setAdminSchool] = useState(initialSchool ?? 'hs')

  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [active, setActive] = useState<Checkout[]>([])
  const [queueBySchool, setQueueBySchool] = useState<Record<string, QueueEntry[]>>({})
  const [nurseBySchool, setNurseBySchool] = useState<Record<string, { out: number; waiting: number }>>({})
  const [nursePass, setNursePass] = useState<{ token: string; school: string; name: string } | null>(null)
  const [todayList, setTodayList] = useState<Checkout[]>([])
  const [, setTick] = useState(0)

  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState('')
  const [dest, setDest] = useState<{ mode: 'location' | 'teacher' | 'custom' | 'nurse'; location?: string; teacherId?: string; reason?: string }>({ mode: 'location', location: 'Bathroom' })
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const [exStudentId, setExStudentId] = useState('')
  const [exKind, setExKind] = useState<'late' | 'kept'>('late')
  const [exReason, setExReason] = useState('')
  const [exMsg, setExMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const [fbType, setFbType] = useState<'issue' | 'request'>('issue')
  const [fbMessage, setFbMessage] = useState('')
  const [fbMsg, setFbMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Admins and "both-school" teachers can pick a school; others are pinned to their own.
  const canSwitch = !!me && (me.isAdmin || me.school === 'both')
  const school = me ? (canSwitch ? adminSchool : (me.school ?? '')) : ''
  const authHeaders = useMemo(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token])

  const loadBoard = useCallback(async (sc: string) => {
    const admin = !!me?.isAdmin
    const [sRes, tRes, cRes] = await Promise.all([
      fetch(`/api/students?school=${sc}&ts=${Date.now()}`, { cache: 'no-store' }),
      fetch(`/api/teachers?school=${sc}&ts=${Date.now()}`, { cache: 'no-store' }),
      // Admins see the whole district on the board; teachers see their own school.
      fetch(admin ? `/api/checkouts?ts=${Date.now()}` : `/api/checkouts?school=${sc}&ts=${Date.now()}`, { cache: 'no-store' }),
    ])
    const [s, t, c] = await Promise.all([sRes.json(), tRes.json(), cRes.json()])
    if (Array.isArray(s)) setStudents(s)
    if (Array.isArray(t)) setTeachers(t)
    if (Array.isArray(c)) setActive(c)

    // Today's checkouts (most recent first) — whole district for admins.
    fetch(admin ? `/api/today?ts=${Date.now()}` : `/api/today?school=${sc}&ts=${Date.now()}`, { headers: authHeaders, cache: 'no-store' })
      .then((r) => r.json()).then((d) => { if (Array.isArray(d)) setTodayList(d) }).catch(() => {})

    // Waiting line + anonymous nurse counts — both schools for an admin, just this one otherwise.
    const schools = admin ? SCHOOLS.map((x) => x.id) : [sc]
    const [qResults, nResults] = await Promise.all([
      Promise.all(schools.map((x) => fetch(`/api/queue?school=${x}&ts=${Date.now()}`, { headers: authHeaders, cache: 'no-store' }).then((r) => r.json()).catch(() => []))),
      Promise.all(schools.map((x) => fetch(`/api/nurse?school=${x}&ts=${Date.now()}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null))),
    ])
    const qmap: Record<string, QueueEntry[]> = {}
    const nmap: Record<string, { out: number; waiting: number }> = {}
    schools.forEach((x, i) => {
      qmap[x] = Array.isArray(qResults[i]) ? qResults[i] : []
      const d = nResults[i]; if (d && typeof d.out === 'number') nmap[x] = { out: d.out, waiting: d.waiting ?? 0 }
    })
    setQueueBySchool(qmap); setNurseBySchool(nmap)
  }, [authHeaders, me])

  const sendToNurse = async () => {
    setMsg(null)
    const name = students.find((s) => s.id === studentId)?.name
    const res = await fetch('/api/nurse', { method: 'POST', headers: authHeaders, body: JSON.stringify({ action: 'go', school }) })
    const data = await res.json()
    if (!res.ok) { setMsg({ text: data.error ?? 'Could not create the pass', ok: false }); return }
    if (data.state === 'out') { setNursePass({ token: data.token, school, name: name?.trim() || 'Student' }); setStudentId(''); setSearch(''); loadBoard(school) }
    else setMsg({ text: `The nurse is at capacity right now (${data.waiting ?? 0} waiting). Please try again shortly.`, ok: false })
  }


  const leaveQueue = async (id: string) => {
    await fetch(`/api/queue?id=${id}`, { method: 'DELETE' })
    loadBoard(school)
  }

  // Staff-clear one anonymous nurse visit (e.g. a student who left without checking in).
  const checkInNurse = async (sc: string) => {
    await fetch('/api/nurse', { method: 'POST', headers: authHeaders, body: JSON.stringify({ action: 'checkin_one', school: sc }) })
    loadBoard(school)
  }

  useEffect(() => {
    ;(async () => {
      const r = await fetch('/api/teacher/me', { headers: authHeaders, cache: 'no-store' })
      if (r.status === 401) { onLogout(); return } // session expired — sign out cleanly
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

  const OutCard = (c: Checkout) => {
    const out = mins(c.check_out_time)
    const color = out >= 10 ? 'border-red-300 bg-red-50' : out >= 6 ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
    const s = c.student as { name?: string } | undefined
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
  }

  // Plain render function (NOT a component) called inline as {navBtn(...)}, so the
  // buttons reconcile in place instead of remounting on every 1s re-render.
  const navBtn = (id: View, label: string, icon: React.ReactNode, badge?: number) => (
    <button key={id} onClick={() => setView(id)}
      className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${view === id ? 'bg-white text-purple-800 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'}`}>
      {icon} <span className="flex-1">{label}</span>
      {!!badge && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">{badge}</span>}
    </button>
  )
  const linkCls = 'flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-white hover:text-gray-900'

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex items-center gap-2 overflow-x-auto border-b border-purple-200/60 bg-gradient-to-b from-purple-100 to-purple-50 p-3 md:sticky md:top-0 md:h-screen md:w-64 md:flex-col md:items-stretch md:gap-1 md:self-start md:overflow-x-visible md:overflow-y-auto md:border-b-0 md:border-r md:p-4">
        {/* Brand — hidden on mobile to keep the bar compact */}
        <div className="mb-6 hidden shrink-0 items-center gap-3 px-1 pt-1 md:flex">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">{icons.grad}</span>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-lg font-semibold leading-tight text-gray-900">{isAdmin ? 'Staff Tools' : 'Teacher Tools'}</h1>
            <p className="truncate text-xs text-gray-500">{me?.name} · {schoolLabel(school)}</p>
          </div>
        </div>

        {canSwitch && (
          <div className="flex shrink-0 gap-1 rounded-lg bg-white p-1 md:mb-4">
            {SCHOOLS.map((s) => (
              <button key={s.id} onClick={() => setAdminSchool(s.id)}
                className={`flex-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-semibold transition ${adminSchool === s.id ? 'bg-white text-purple-800 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        <nav className="contents md:flex md:flex-col md:gap-1">
          {navBtn('home', 'Check Out & Board', icons.board)}
          {navBtn('today', "Today's List", icons.today)}
          {navBtn('issue', 'Issue Pass', icons.ticket)}
          {navBtn('excuse', 'Excuse Student', icons.edit)}
          {navBtn('feedback', 'Report / Request', icons.message)}
          <div className="hidden h-px bg-gray-200 md:my-3 md:block" />
          <a href={`/reports?school=${school}`} className={linkCls}>{icons.chart} Reports</a>
          {isAdmin && (
            <a href="/admin" className={linkCls}>{icons.settings} Admin Panel</a>
          )}
        </nav>

        <button onClick={onLogout} className={`${linkCls} md:mt-auto`}>{icons.logout} Log Out</button>
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
              ) : isAdmin ? (
                // Admins see the whole district as two columns: Middle School | High School.
                <div className="grid divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:grid-cols-2 md:divide-y-0 md:divide-x">
                  {(['ms', 'hs'] as const).map((id) => {
                    const sc = SCHOOLS.find((s) => s.id === id)
                    const list = active.filter((c) => c.school === id)
                    const accent = id === 'ms'
                      ? { chip: 'bg-teal-100 text-teal-700', bar: 'bg-teal-400' }
                      : { chip: 'bg-indigo-100 text-indigo-700', bar: 'bg-indigo-400' }
                    return (
                      <div key={id} className="p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <span className={`h-5 w-1.5 rounded-full ${accent.bar}`} />
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${accent.chip}`}>{sc?.label}</span>
                          <span className="text-sm text-gray-400">{list.length} out</span>
                        </div>
                        {list.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm italic text-gray-400">None out</p>
                        ) : (
                          <div className="flex flex-col gap-3">{list.map(OutCard)}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{active.map(OutCard)}</div>
              )}

              {(() => {
                const schools = isAdmin ? SCHOOLS.map((x) => x.id) : [school]
                const anyNurse = schools.some((sc) => (nurseBySchool[sc]?.out || 0) > 0 || (nurseBySchool[sc]?.waiting || 0) > 0)
                if (!anyNurse) return null
                return (
                  <div className="mt-8 rounded-2xl border border-red-200 bg-red-50/60 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🩺</span>
                      <p className="font-bold text-gray-900">Nurse <span className="text-xs font-normal text-gray-500">· anonymous</span></p>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {schools.map((sc) => {
                        const n = nurseBySchool[sc] ?? { out: 0, waiting: 0 }
                        if (n.out === 0 && n.waiting === 0) return null
                        return (
                          <div key={sc} className="flex items-center justify-between rounded-xl border border-red-100 bg-white px-3 py-2 text-sm">
                            <span className="font-semibold text-gray-800">{isAdmin ? `${schoolLabel(sc)}: ` : 'At the nurse: '}{n.out}{n.waiting > 0 ? ` · ${n.waiting} waiting` : ''}</span>
                            {n.out > 0 && <button onClick={() => checkInNurse(sc)} className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">Check one in</button>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {isAdmin ? (
                (['ms', 'hs'] as const).some((id) => (queueBySchool[id]?.length ?? 0) > 0) && (
                  <div className="mt-8 grid gap-4 md:grid-cols-2">
                    {(['ms', 'hs'] as const).map((id) => {
                      const q = queueBySchool[id] ?? []
                      const label = SCHOOLS.find((s) => s.id === id)?.label
                      return q.length === 0 ? (
                        <div key={id} className="rounded-2xl border border-dashed border-gray-200 bg-white/50 p-5">
                          <p className="text-sm font-bold text-gray-500">⏳ {label} · Waiting Line</p>
                          <p className="mt-2 text-sm italic text-gray-400">No one waiting.</p>
                        </div>
                      ) : (
                        <QueuePanel key={id} queue={q} onLeave={leaveQueue} title={`${label} · Waiting Line`} />
                      )
                    })}
                  </div>
                )
              ) : (
                (queueBySchool[school]?.length ?? 0) > 0 && (
                  <div className="mt-8">
                    <QueuePanel queue={queueBySchool[school] ?? []} onLeave={leaveQueue} />
                  </div>
                )
              )}

              <h2 className="mb-4 mt-8 text-2xl font-bold text-gray-900">Check Out a Student</h2>
              <div className="max-w-2xl">
                <CheckoutPanel students={students} teachers={teachers}
                  activeCheckouts={active} onCheckoutSuccess={() => loadBoard(school)} />
              </div>
            </>
          )}

          {view === 'today' && (
            <>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">Today&apos;s Checkouts <span className="text-base font-normal text-gray-400">({todayList.length})</span></h2>
              {todayList.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                  <div className="text-3xl text-gray-300">✓</div>
                  <p className="mt-2 text-sm text-gray-500">No checkouts yet today.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        {['Student', 'Location', 'Teacher', 'Out', 'Back', 'Min'].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {todayList.map((r) => {
                        const st = r.student as { name?: string } | undefined
                        const te = r.teacher as { name?: string } | undefined
                        const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''
                        return (
                          <tr key={r.id} className={r.is_checked_out ? 'bg-amber-50/60' : ''}>
                            <td className="px-3 py-2.5 font-medium text-gray-900">{st?.name ?? '—'}{isAdmin && r.school ? <span className="ml-1 text-[10px] font-bold text-gray-400">{String(r.school).toUpperCase()}</span> : null}</td>
                            <td className="px-3 py-2.5 text-purple-700">{r.location}</td>
                            <td className="px-3 py-2.5 text-gray-500">{te?.name ?? '—'}</td>
                            <td className="px-3 py-2.5 text-gray-600">{fmt(r.check_out_time)}</td>
                            <td className="px-3 py-2.5 text-gray-600">{r.is_checked_out ? <span className="font-semibold text-amber-600">Still out</span> : fmt(r.check_in_time)}</td>
                            <td className="px-3 py-2.5 font-semibold text-gray-800">{r.is_checked_out ? mins(r.check_out_time) : (r.duration_minutes ?? 0)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">Everyone who checked out today, most recent first. Amber = still out. (Anonymous nurse passes are not listed.)</p>
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
                {['Bathroom', 'Office', 'Counselor'].map((l) => (
                  <button key={l} onClick={() => setDest({ mode: 'location', location: l })}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${dest.mode === 'location' && dest.location === l ? 'bg-purple-800 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{l}</button>
                ))}
                <button onClick={() => setDest({ mode: 'teacher' })} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${dest.mode === 'teacher' ? 'bg-purple-800 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Another teacher</button>
                <button onClick={() => setDest({ mode: 'custom' })} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${dest.mode === 'custom' ? 'bg-purple-800 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Custom</button>
                <button onClick={() => setDest({ mode: 'nurse' })} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${dest.mode === 'nurse' ? 'bg-red-500 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>🩺 Nurse</button>
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
              {dest.mode === 'nurse' && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  A nurse pass is <b>anonymous</b> — the student is <b>not recorded</b> anywhere. The name only shows on the pass so it can be carried.
                </div>
              )}

              {dest.mode === 'nurse' ? (
                <button onClick={sendToNurse} className="mt-2 w-full rounded-2xl bg-red-500 py-3.5 text-base font-bold text-white hover:bg-red-600">Give Nurse Pass{canSwitch ? ` (${schoolLabel(school)})` : ''}</button>
              ) : (
                <button onClick={issuePass} className="mt-2 w-full rounded-2xl bg-purple-800 py-3.5 text-base font-bold text-white hover:bg-purple-900">Issue Pass</button>
              )}
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

      {nursePass && (
        <NursePass token={nursePass.token} name={nursePass.name} school={nursePass.school}
          onClose={() => { setNursePass(null); loadBoard(school) }} />
      )}
    </div>
  )
}
