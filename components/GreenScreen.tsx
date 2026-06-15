'use client'

import { useState, useEffect } from 'react'
import PinModal from './PinModal'
import type { Checkout, Student, Teacher } from '@/lib/types'

interface Props {
  checkout: Checkout
  student: Student
  teacher: Teacher | undefined
  onCheckedIn: () => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function useElapsed(startIso: string) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000)
      setElapsed(diff)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startIso])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return `${mins}m ${secs.toString().padStart(2, '0')}s`
}

export default function GreenScreen({ checkout, student, teacher, onCheckedIn }: Props) {
  const [showPin, setShowPin] = useState(false)
  const elapsed = useElapsed(checkout.check_out_time)

  const handleCheckin = async (pin: string): Promise<string | null> => {
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutId: checkout.id, studentId: student.id, pin }),
    })
    const data = await res.json()
    if (!res.ok) return data.error ?? 'Check-in failed'
    onCheckedIn()
    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-between bg-green-600 p-8 text-white">
      {/* Top bar */}
      <div className="flex w-full items-center justify-between">
        <div className="rounded-full bg-white/20 px-4 py-2 text-lg font-bold">
          {checkout.location}
        </div>
        <div className="rounded-full bg-white/20 px-4 py-2 text-lg font-bold">
          {teacher?.name ?? ''}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Big checkmark */}
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/20 text-7xl">
          ✓
        </div>

        <div className="text-3xl font-semibold uppercase tracking-widest opacity-80">
          Checked Out
        </div>

        <div className="text-6xl font-bold leading-tight md:text-7xl">
          {student.name}
        </div>

        <div className="flex flex-col items-center gap-2 text-xl opacity-90">
          <span>Left at {formatTime(checkout.check_out_time)}</span>
          <span className="text-2xl font-bold">{elapsed}</span>
        </div>
      </div>

      {/* Check back in button */}
      <button
        onClick={() => setShowPin(true)}
        className="w-full max-w-sm rounded-2xl bg-white py-5 text-2xl font-bold text-green-700 shadow-lg transition active:scale-95 hover:bg-green-50"
      >
        Check Back In
      </button>

      {showPin && (
        <PinModal
          title={`Check back in, ${student.name.split(',')[1]?.trim() ?? student.name}?`}
          onSubmit={handleCheckin}
          onClose={() => setShowPin(false)}
        />
      )}
    </div>
  )
}
