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

export default function CheckoutForm({
  gender,
  title,
  students,
  teachers,
  activeCheckouts,
  onCheckoutSuccess,
}: Props) {
  const [studentId, setStudentId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [location, setLocation] = useState('')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'warn' } | null>(null)
  const [showPin, setShowPin] = useState(false)

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase()
    return students
      .filter((s) => s.gender === gender && (!q || s.name.toLowerCase().includes(q)))
  }, [students, gender, search])

  const selectedStudent = students.find((s) => s.id === studentId)

  const flash = (text: string, type: 'error' | 'warn' = 'warn') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleCheckout = () => {
    if (!studentId || !teacherId || !location) {
      flash('Please select a student, location, and teacher', 'error')
      return
    }

    // If already checked out, just show green screen
    const existingCheckout = activeCheckouts.find((c) => c.student_id === studentId)
    if (existingCheckout && selectedStudent) {
      onCheckoutSuccess(existingCheckout, selectedStudent)
      return
    }

    setShowPin(true)
  }

  const submitCheckout = async (pin: string): Promise<string | null> => {
    const selectedTeacher = teachers.find((t) => t.id === teacherId)

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        teacherId,
        roomId: selectedTeacher?.room_id ?? teacherId,
        location,
        pin,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      if (data.limitReached) {
        flash(data.error, 'warn')
        return data.error
      }
      return data.error ?? 'Checkout failed'
    }

    // Success — clear form and show green screen
    if (selectedStudent) {
      onCheckoutSuccess(data.checkout, selectedStudent)
    }
    setStudentId('')
    setTeacherId('')
    setLocation('')
    setSearch('')
    return null
  }

  return (
    <div className="rounded-2xl bg-white/10 p-6">
      <h2 className="mb-6 text-center text-3xl font-bold text-white">{title}</h2>

      {/* Student search */}
      <div className="mb-3">
        <label className="mb-1 block text-sm font-semibold text-white/80">Search Student</label>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setStudentId('') }}
          placeholder="Type name to filter..."
          className="w-full rounded-xl border-2 border-forest-600 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:border-forest-300 focus:outline-none"
        />
      </div>

      {/* Student select */}
      <div className="mb-3">
        <label className="mb-1 block text-sm font-semibold text-white/80">Select Student</label>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full rounded-xl border-2 border-forest-600 bg-forest-800 px-4 py-3 text-white focus:border-forest-300 focus:outline-none"
        >
          <option value="">Choose a student</option>
          {filteredStudents.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Location select */}
      <div className="mb-3">
        <label className="mb-1 block text-sm font-semibold text-white/80">Location</label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full rounded-xl border-2 border-forest-600 bg-forest-800 px-4 py-3 text-white focus:border-forest-300 focus:outline-none"
        >
          <option value="">Choose a location</option>
          <option value="Bathroom">Bathroom</option>
          <option value="Office">Office</option>
          <option value="Nurse">Nurse</option>
        </select>
      </div>

      {/* Teacher select */}
      <div className="mb-5">
        <label className="mb-1 block text-sm font-semibold text-white/80">Your Teacher</label>
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="w-full rounded-xl border-2 border-forest-600 bg-forest-800 px-4 py-3 text-white focus:border-forest-300 focus:outline-none"
        >
          <option value="">Choose a teacher</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleCheckout}
        className="w-full rounded-xl bg-forest-600 py-4 text-lg font-bold text-white transition hover:bg-forest-700 active:scale-95"
      >
        Check Out
      </button>

      {message && (
        <div className={`mt-4 rounded-xl border-2 px-4 py-3 text-center font-semibold ${
          message.type === 'error'
            ? 'border-red-500 bg-red-500/20 text-red-200'
            : 'border-forest-300 bg-forest-300/20 text-forest-200'
        }`}>
          {message.text}
        </div>
      )}

      {showPin && selectedStudent && (
        <PinModal
          title={`Enter PIN for ${selectedStudent.name.split(',')[1]?.trim() ?? selectedStudent.name}`}
          onSubmit={submitCheckout}
          onClose={() => setShowPin(false)}
        />
      )}
    </div>
  )
}
