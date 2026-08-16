'use client'

import { useMemo, useState } from 'react'
import { nameMatches } from '@/lib/search'
import type { Student, Teacher } from '@/lib/types'

// Student-initiated PIN change (requires their teacher's approval).
export default function ChangePinModal({
  students, teachers, onClose,
}: {
  students: Student[]
  teachers: Teacher[]
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState('')
  const [focused, setFocused] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim()
    return students.filter((s) => !q || nameMatches(s.name, q))
  }, [students, search])

  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 4)
  const inputCls = 'w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-700 focus:outline-none'

  const submit = async () => {
    if (!studentId) return setMsg({ text: 'Choose your name.', ok: false })
    if (currentPin.length !== 4) return setMsg({ text: 'Enter your current 4-digit PIN.', ok: false })
    if (newPin.length !== 4) return setMsg({ text: 'Enter a new 4-digit PIN.', ok: false })
    if (newPin !== confirmPin) return setMsg({ text: 'The new PINs don’t match.', ok: false })
    if (!teacherId) return setMsg({ text: 'Choose your teacher.', ok: false })
    setSubmitting(true); setMsg(null)
    try {
      const res = await fetch('/api/pin-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, currentPin, newPin, teacherId }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ text: data.error ?? 'Could not submit.', ok: false }); setSubmitting(false); return }
      setDone(data.teacherName ?? 'your teacher')
    } catch {
      setMsg({ text: 'Something went wrong. Try again.', ok: false })
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="text-center">
            <div className="mb-3 text-5xl">📨</div>
            <h2 className="mb-1 text-xl font-bold text-gray-900">Request sent</h2>
            <p className="mb-6 text-sm text-gray-600">Your PIN change was sent to <span className="font-semibold">{done}</span> for approval. Keep using your <span className="font-semibold">current</span> PIN until they approve it.</p>
            <button onClick={onClose} className="w-full rounded-2xl bg-purple-800 py-3 text-sm font-bold text-white hover:bg-purple-900">Done</button>
          </div>
        ) : (
          <>
            <h2 className="mb-1 text-xl font-bold text-gray-900">Change My PIN</h2>
            <p className="mb-4 text-sm text-gray-500">Your teacher approves the change before it takes effect.</p>

            {/* Name */}
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Your Name</label>
            <div className="relative mb-4">
              <input value={search} onChange={(e) => { setSearch(e.target.value); setStudentId(''); setFocused(true) }}
                onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder="Type your name…" className={inputCls} />
              {focused && !studentId && (
                <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  {filtered.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">No match</p> :
                    filtered.slice(0, 50).map((s) => (
                      <button key={s.id} type="button" onClick={() => { setStudentId(s.id); setSearch(s.name); setFocused(false) }}
                        className="block w-full px-4 py-2.5 text-left text-sm text-gray-900 hover:bg-purple-50">{s.name}</button>
                    ))}
                </div>
              )}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Current PIN</label>
                <input type="password" inputMode="numeric" value={currentPin} onChange={(e) => setCurrentPin(digits(e.target.value))} placeholder="••••" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">New PIN</label>
                <input type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(digits(e.target.value))} placeholder="••••" className={inputCls} />
              </div>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Confirm New PIN</label>
              <input type="password" inputMode="numeric" value={confirmPin} onChange={(e) => setConfirmPin(digits(e.target.value))} placeholder="••••" className={inputCls} />
            </div>

            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">Your Teacher (approves this)</label>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={`mb-5 ${inputCls}`}>
              <option value="">Choose your teacher</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            {msg && <p className={`mb-3 text-sm font-medium ${msg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{msg.text}</p>}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-2xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={submit} disabled={submitting} className="flex-1 rounded-2xl bg-purple-800 py-3 text-sm font-bold text-white hover:bg-purple-900 disabled:opacity-40">
                {submitting ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
