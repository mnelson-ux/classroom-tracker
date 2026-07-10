'use client'

import { useState, useMemo } from 'react'
import PinModal from './PinModal'
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return students.filter(s => s.gender === gender && (!q || s.name.toLowerCase().includes(q)))
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
      body: JSON.stringify({ studentId, teacherId, roomId: t?.room_id ?? teacherId, location, pin }),
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
  const accentColor = isGirls ? 'text-purple-800' : 'text-amber-600'
  const topBorder = isGirls ? 'border-t-4 border-t-purple-800' : 'border-t-4 border-t-amber-500'

  return (
    <div className={`rounded-2xl bg-white shadow-sm ${topBorder}`}>
      <div className="p-6">
        <h2 className={`mb-5 text-2xl font-bold ${accentColor}`}>{title}</h2>

        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Search Student</label>
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setStudentId('') }}
            placeholder="Type name to filter..." className={inputCls} />
        </div>

        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Student</label>
          <select value={studentId} onChange={e => setStudentId(e.target.value)} className={inputCls}>
            <option value="">Choose a student</option>
            {filtered.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
          className="w-full rounded-xl bg-purple-800 py-3.5 text-sm font-bold text-white transition hover:bg-purple-900 active:scale-[0.98]">
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
