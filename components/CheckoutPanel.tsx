'use client'

import { useMemo, useState } from 'react'
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
]

const inputCls =
  'w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-700/20'

export default function CheckoutPanel({ students, teachers, activeCheckouts, onCheckoutSuccess }: Props) {
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState('')
  const [location, setLocation] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'warn' } | null>(null)
  const [showPin, setShowPin] = useState(false)
  const [limitVideo, setLimitVideo] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim()
    return students.filter((s) => !q || nameMatches(s.name, q))
  }, [students, search])
  const sorted = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name)), [students])
  const selectedStudent = students.find((s) => s.id === studentId)
  const firstName = selectedStudent ? selectedStudent.name.split(',')[1]?.trim() ?? selectedStudent.name : ''

  const flash = (text: string, type: 'error' | 'warn' = 'warn') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleCheckout = () => {
    if (!studentId || !location || !teacherId) { flash('Please choose your name, a location, and your teacher', 'error'); return }
    const existing = activeCheckouts.find((c) => c.student_id === studentId)
    if (existing && selectedStudent) { onCheckoutSuccess(existing, selectedStudent); return }
    setShowPin(true)
  }

  const submitCheckout = async (pin: string): Promise<string | null> => {
    const t = teachers.find((t) => t.id === teacherId)
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
        <div className="mb-6 grid grid-cols-3 gap-3">
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
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Your Teacher</label>
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={`mb-6 ${inputCls}`}>
          <option value="">Choose your teacher</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <button onClick={handleCheckout} disabled={!ready}
          className={`w-full rounded-2xl py-4 text-lg font-bold text-white shadow-sm transition active:scale-[0.98] ${ready ? 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800' : 'cursor-not-allowed bg-gray-300'}`}>
          {ready ? `Check Out — ${firstName}` : 'Check Out'}
        </button>

        {message && (
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
            {message.text}
          </div>
        )}
      </div>

      {showPin && selectedStudent && (
        <PinModal title={`PIN for ${firstName}`} onSubmit={submitCheckout} onClose={() => setShowPin(false)} />
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
