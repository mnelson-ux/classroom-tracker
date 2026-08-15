'use client'

import { useEffect, useMemo, useState } from 'react'
import PinModal from './PinModal'
import { nameMatches } from '@/lib/search'
import type { Student, Teacher, Checkout } from '@/lib/types'

interface Props {
  students: Student[]
  teachers: Teacher[]
  activeCheckouts: Checkout[]
  onCheckoutSuccess: (checkout: Checkout, student: Student) => void
}

const LOCATIONS = [
  { name: 'Bathroom', icon: '🚻' },
  { name: 'Office', icon: '🏢' },
  { name: 'Nurse', icon: '🩺' },
  { name: 'Counselor', icon: '💬' },
]

const SYMPTOMS = ['Stomach Ache', 'Sore Throat', 'Head Ache', 'Hurt Muscle', 'Hurt Body Part', 'Bleeding']

const inputCls =
  'w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-700/20'

export default function CheckoutPanel({ students, teachers, activeCheckouts, onCheckoutSuccess }: Props) {
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState('')
  const [location, setLocation] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'warn' | 'ok' } | null>(null)
  const [showPin, setShowPin] = useState(false)
  const [showHealth, setShowHealth] = useState(false)
  const [limitVideo, setLimitVideo] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  // Nurse health form
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [otherNote, setOtherNote] = useState('')
  const [initials, setInitials] = useState('')

  // Queue
  const [queuePrompt, setQueuePrompt] = useState<{ location: string; position: number } | null>(null)
  const [pendingPin, setPendingPin] = useState('')
  const [queued, setQueued] = useState<{ location: string } | null>(null)
  const [queueReady, setQueueReady] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim()
    return students.filter((s) => !q || nameMatches(s.name, q))
  }, [students, search])
  const sorted = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name)), [students])
  const selectedStudent = students.find((s) => s.id === studentId)
  const firstName = selectedStudent ? selectedStudent.name.split(',')[1]?.trim() ?? selectedStudent.name : ''

  const flash = (text: string, type: 'error' | 'warn' | 'ok' = 'warn') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 6000)
  }

  const resetForm = () => { setStudentId(''); setTeacherId(''); setLocation(''); setSearch(''); setSymptoms([]); setOtherNote(''); setInitials('') }

  // While in line, quietly poll THIS student's own status (their turn or not).
  // Nothing about the rest of the line is shown — no names, no position number.
  useEffect(() => {
    if (!queued || !studentId || !selectedStudent) return
    let stop = false
    const check = async () => {
      try {
        const r = await fetch(`/api/queue/status?studentId=${studentId}&school=${selectedStudent.school}&ts=${Date.now()}`, { cache: 'no-store' })
        const d = await r.json()
        if (stop) return
        if (!d.inLine) { setQueued(null); setQueueReady(false); resetForm() }
        else setQueueReady(!!d.ready)
      } catch {}
    }
    check()
    const id = setInterval(check, 7000)
    return () => { stop = true; clearInterval(id) }
  }, [queued, studentId, selectedStudent])

  const handleCheckout = () => {
    if (!studentId || !location || !teacherId) { flash('Please choose your name, a location, and your teacher', 'error'); return }
    const existing = activeCheckouts.find((c) => c.student_id === studentId)
    if (existing && selectedStudent) { onCheckoutSuccess(existing, selectedStudent); return }
    // Nurse requires the quick health form + a teacher's approval first.
    if (location === 'Nurse') { setShowHealth(true); return }
    setShowPin(true)
  }

  const submitCheckout = async (pin: string): Promise<string | null> => {
    const t = teachers.find((t) => t.id === teacherId)
    const res = await fetch('/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId, teacherId, roomId: t?.room_id ?? null, location, pin,
        healthSymptoms: symptoms, healthNote: otherNote, healthInitials: initials,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      if (data.limitReached) { flash(data.error, 'warn'); setShowPin(false); setLimitVideo(data.error); return null }
      // Location is full — offer the waiting line instead of a dead end.
      if (data.canQueue) { setPendingPin(pin); setQueuePrompt({ location: data.location, position: data.position }); setShowPin(false); return null }
      if (data.inQueue || data.queueFull || data.protectedTime) { flash(data.error, 'warn'); setShowPin(false); return null }
      return data.error ?? 'Checkout failed'
    }
    if (selectedStudent) onCheckoutSuccess(data.checkout, selectedStudent)
    setQueued(null); setQueueReady(false)
    resetForm()
    return null
  }

  const joinQueue = async () => {
    if (!queuePrompt) return
    const t = teachers.find((t) => t.id === teacherId)
    const res = await fetch('/api/queue', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, teacherId: t?.id ?? null, location: queuePrompt.location, pin: pendingPin }),
    })
    const data = await res.json()
    const loc = queuePrompt.location
    setQueuePrompt(null); setPendingPin('')
    if (!res.ok) { flash(data.error ?? 'Could not join the line', 'error'); return }
    // Enter private "in line" mode on this student's own device. No list, no number.
    setQueued({ location: loc }); setQueueReady(false)
  }

  const leaveLine = async () => {
    if (studentId) await fetch(`/api/queue?studentId=${studentId}`, { method: 'DELETE' })
    setQueued(null); setQueueReady(false); resetForm()
  }

  const ready = !!(studentId && location && teacherId)

  return (
    <div className="overflow-hidden rounded-3xl bg-white/80 shadow-sm ring-1 ring-gray-200/70 backdrop-blur-sm">
      <div className="bg-gradient-to-r from-purple-800 via-violet-700 to-indigo-700 px-7 py-5">
        <h2 className="text-2xl font-bold text-white">Check Out</h2>
        <p className="text-sm text-purple-100">Find your name, choose where you&apos;re going, then pick your teacher.</p>
      </div>

      <div className="p-7">
        {/* Name */}
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Your Name</label>
        <div className="relative mb-3">
          <input type="text" value={search}
            onChange={(e) => { setSearch(e.target.value); setStudentId(''); setFocused(true) }}
            onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Type your name…" className={inputCls} />
          {focused && !studentId && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">No students match “{search}”.</p>
              ) : (
                filtered.map((s) => (
                  <button key={s.id} type="button" onClick={() => { setStudentId(s.id); setSearch(s.name); setFocused(false) }}
                    className="block w-full px-4 py-3 text-left text-sm text-gray-900 hover:bg-purple-50">{s.name}</button>
                ))
              )}
            </div>
          )}
        </div>
        <select value={studentId}
          onChange={(e) => { const id = e.target.value; setStudentId(id); setSearch(students.find((s) => s.id === id)?.name ?? '') }}
          className={`mb-6 ${inputCls}`}>
          <option value="">…or pick from the list</option>
          {sorted.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {/* Location tiles */}
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Where are you going?</label>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LOCATIONS.map((l) => {
            const on = location === l.name
            return (
              <button key={l.name} onClick={() => setLocation(l.name)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-5 text-sm font-bold transition active:scale-95 ${on ? 'border-transparent bg-gradient-to-br from-purple-700 to-indigo-700 text-white shadow-md' : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'}`}>
                <span className="text-3xl">{l.icon}</span>
                {l.name}
              </button>
            )
          })}
        </div>

        {/* Teacher */}
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Your Current Teacher</label>
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={`mb-6 ${inputCls}`}>
          <option value="">Choose your teacher</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <button onClick={handleCheckout} disabled={!ready}
          className={`w-full rounded-2xl py-4 text-lg font-bold text-white shadow-sm transition active:scale-[0.98] ${ready ? 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800' : 'cursor-not-allowed bg-gray-300'}`}>
          {ready ? `Check Out — ${firstName}` : 'Check Out'}
        </button>

        {message && (
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700' : message.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Nurse health form + teacher approval */}
      {showHealth && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={() => setShowHealth(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">🩺</span>
              <h2 className="text-lg font-bold text-gray-900">Health Pass — {firstName}</h2>
            </div>
            <p className="mb-3 text-sm text-gray-500">Check anything that applies:</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {SYMPTOMS.map((sym) => {
                const on = symptoms.includes(sym)
                return (
                  <button key={sym} type="button"
                    onClick={() => setSymptoms((cur) => on ? cur.filter((x) => x !== sym) : [...cur, sym])}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition ${on ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-700 hover:border-red-200'}`}>
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-red-500 bg-red-500 text-white' : 'border-gray-300'}`}>{on ? '✓' : ''}</span>
                    {sym}
                  </button>
                )
              })}
            </div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Other</label>
            <textarea value={otherNote} onChange={(e) => setOtherNote(e.target.value)} rows={2}
              placeholder="Anything else…" className={`mb-4 ${inputCls}`} />

            <div className="mb-4 rounded-xl bg-purple-50 p-4">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-purple-800">Teacher approval</label>
              <p className="mb-2 text-xs text-purple-700">A teacher enters their initials to approve this pass.</p>
              <input value={initials} onChange={(e) => setInitials(e.target.value.slice(0, 6))}
                placeholder="Initials" className="w-32 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm font-semibold uppercase text-gray-900 focus:border-purple-700 focus:outline-none" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowHealth(false)} className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => { setShowHealth(false); setShowPin(true) }}
                disabled={!initials.trim() || (symptoms.length === 0 && !otherNote.trim())}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
                Approve &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showPin && selectedStudent && (
        <PinModal title={`PIN for ${firstName}`} onSubmit={submitCheckout} onClose={() => setShowPin(false)} />
      )}

      {/* Location full → join the line */}
      {queuePrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mb-2 text-4xl">⏳</div>
            <h2 className="mb-1 text-lg font-bold text-gray-900">The {queuePrompt.location} is full</h2>
            <p className="mb-5 text-sm text-gray-500">Do you want to wait in line? You&apos;d be <span className="font-bold text-gray-900">#{queuePrompt.position}</span>. We&apos;ll show your name on the screen when it&apos;s your turn.</p>
            <div className="flex gap-3">
              <button onClick={() => { setQueuePrompt(null); setPendingPin(''); resetForm() }} className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">No thanks</button>
              <button onClick={joinQueue} className="flex-1 rounded-xl bg-purple-800 py-3 text-sm font-semibold text-white hover:bg-purple-900">Join the line</button>
            </div>
          </div>
        </div>
      )}

      {/* Private "in line" status — only this student's own turn, nothing else */}
      {queued && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
            {queueReady ? (
              <>
                <div className="mb-3 text-5xl">✅</div>
                <h2 className="mb-1 text-2xl font-bold text-emerald-700">It&apos;s your turn!</h2>
                <p className="mb-6 text-sm text-gray-600">A spot for the {queued.location} just opened up{firstName ? `, ${firstName}` : ''}. Tap below to check out now.</p>
                <button onClick={() => setShowPin(true)}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 py-4 text-lg font-bold text-white shadow-sm hover:from-emerald-700 hover:to-green-700">
                  Check Out Now
                </button>
              </>
            ) : (
              <>
                <div className="mb-3 text-5xl">⏳</div>
                <h2 className="mb-1 text-2xl font-bold text-gray-900">You&apos;re in line</h2>
                <p className="mb-6 text-sm text-gray-600">The {queued.location} is full right now. Hang tight — this screen will let you know the moment it&apos;s your turn. You don&apos;t need to do anything.</p>
              </>
            )}
            <button onClick={leaveLine} className="mt-3 w-full rounded-2xl border border-gray-300 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">Leave the line</button>
          </div>
        </div>
      )}

      {limitVideo && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
          <video src="/limit-reached.mp4" autoPlay playsInline onEnded={() => setLimitVideo(null)}
            className="max-h-[70vh] w-auto max-w-full rounded-xl shadow-2xl" />
          <p className="mt-6 max-w-lg text-center text-2xl font-bold text-white">{limitVideo}</p>
          <button onClick={() => setLimitVideo(null)} className="mt-6 rounded-xl bg-white px-8 py-3 text-lg font-bold text-gray-900 hover:bg-gray-100">Close</button>
        </div>
      )}
    </div>
  )
}
