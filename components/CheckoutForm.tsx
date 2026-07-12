'use client'

import { useState, useMemo } from 'react'
import PinModal from './PinModal'
import { nameMatches } from '@/lib/search'
import type { Student, Teacher, Checkout } from '@/lib/types'

interface Props {
  gender: 'male' | 'female'
  title: string
  students: Student[]
  teachers: Teacher[]
  activeCheckouts: Checkout[]
  onCheckoutSuccess: (checkout: Checkout, student: Student) => void
}

const inputCls = 'w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-700/20'

export default function CheckoutForm({ gender, title, students, teachers, activeCheckouts, onCheckoutSuccess }: Props) {
  const [studentId, setStudentId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [location, setLocation] = useState('')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'warn' } | null>(null)
  const [showPin, setShowPin] = useState(false)
  const [limitVideo, setLimitVideo] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim()
    return students.filter(s => s.gender === gender && (!q || nameMatches(s.name, q)))
  }, [students, gender, search])

  const selectedStudent = students.find(s => s.id === studentId)

  const flash = (text: string, type: 'error' | 'warn' = 'warn') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleCheckout = () => {
    if (!studentId || !teacherId || !location) { flash('Please select a student, location, and teacher', 'error'); return }
    const existing = activeCheckouts.find(c => c.student_id === studentId)
    if (existing && selectedStudent) { onCheckoutSuccess(existing, selectedStudent); return }
    setShowPin(true)
  }

  const submitCheckout = async (pin: string): Promise<string | null> => {
    const t = teachers.find(t => t.id === teacherId)
    const res = await fetch('/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, teacherId, roomId: t?.room_id ?? null, location, pin }),
    })
    const data = await res.json()
    if (!res.ok) {
      if (data.limitReached) { flash(data.error, 'warn'); setShowPin(false); setLimitVideo(data.error) }
      return data.error ?? 'Checkout failed'
    }
    if (selectedStudent) onCheckoutSuccess(data.checkout, selectedStudent)
    setStudentId(''); setTeacherId(''); setLocation(''); setSearch('')
    return null
  }

  const isGirls = gender === 'female'
  const bandBg = isGirls ? 'bg-purple-800' : 'bg-amber-500'

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className={`flex items-center gap-3 px-7 py-4 ${bandBg}`}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-xl font-bold text-white">{isGirls ? '♀' : '♂'}</span>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="p-7">

        <div className="relative mb-3">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Student</label>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setStudentId(''); setFocused(true) }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Type your name…"
            className={inputCls}
          />
          {focused && !studentId && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">No students match “{search}”.</p>
              ) : (
                filtered.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setStudentId(s.id); setSearch(s.name); setFocused(false) }}
                    className="block w-full px-4 py-3 text-left text-sm text-gray-900 hover:bg-purple-50"
                  >
                    {s.name}
                  </button>
                ))
              )}
            </div>
          )}
          {studentId && selectedStudent && (
            <p className="mt-1.5 text-xs font-medium text-emerald-700">✓ Selected: {selectedStudent.name}</p>
          )}
        </div>

        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">…or pick from the list</label>
          <select
            value={studentId}
            onChange={e => {
              const id = e.target.value
              setStudentId(id)
              setSearch(students.find(s => s.id === id)?.name ?? '')
            }}
            className={inputCls}
          >
            <option value="">Choose a student</option>
            {students
              .filter(s => s.gender === gender)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Location</label>
          <select value={location} onChange={e => setLocation(e.target.value)} className={inputCls}>
            <option value="">Choose a location</option>
            <option value="Bathroom">Bathroom</option>
            <option value="Office">Office</option>
            <option value="Nurse">Nurse</option>
          </select>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Your Teacher</label>
          <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className={inputCls}>
            <option value="">Choose a teacher</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <button onClick={handleCheckout}
          className="w-full rounded-2xl bg-purple-800 py-4 text-base font-bold text-white shadow-sm transition hover:bg-purple-900 active:scale-[0.98]">
          Check Out
        </button>

        {message && (
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
            {message.text}
          </div>
        )}
      </div>

      {showPin && selectedStudent && (
        <PinModal title={`PIN for ${selectedStudent.name.split(',')[1]?.trim() ?? selectedStudent.name}`}
          onSubmit={submitCheckout} onClose={() => setShowPin(false)} />
      )}

      {limitVideo && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
          <video
            src="/limit-reached.mp4"
            autoPlay
            playsInline
            onEnded={() => setLimitVideo(null)}
            className="max-h-[70vh] w-auto max-w-full rounded-xl shadow-2xl"
          />
          <p className="mt-6 max-w-lg text-center text-2xl font-bold text-white">{limitVideo}</p>
          <button onClick={() => setLimitVideo(null)}
            className="mt-6 rounded-xl bg-white px-8 py-3 text-lg font-bold text-gray-900 hover:bg-gray-100">
            Close
          </button>
        </div>
      )}
    </div>
  )
}
