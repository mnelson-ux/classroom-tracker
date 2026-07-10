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
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function useElapsed(startIso: string) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(startIso).getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startIso])
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
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

  const firstName = student.name.includes(',')
    ? student.name.split(',')[1]?.trim()
    : student.name

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-emerald-500">
      {/* Top info strip */}
      <div className="flex items-center justify-between px-8 pt-8">
        <div className="rounded-full bg-white/20 px-4 py-2">
          <p className="text-sm font-semibold text-white">{checkout.location}</p>
        </div>
        <div className="rounded-full bg-white/20 px-4 py-2">
          <p className="text-sm font-semibold text-white">{teacher?.name ?? ''}</p>
        </div>
      </div>

      {/* Center content */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        {/* Checkmark circle */}
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/25">
          <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <p className="mb-1 text-lg font-medium text-white/80 uppercase tracking-widest">Checked Out</p>
          <h1 className="text-5xl font-bold text-white sm:text-7xl">{firstName}</h1>
          <p className="mt-2 text-xl font-medium text-white/80">{student.name.split(',')[0]}</p>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="text-6xl font-bold tabular-nums text-white">{elapsed}</p>
          <p className="text-base text-white/70">Left at {formatTime(checkout.check_out_time)}</p>
        </div>
      </div>

      {/* Check back in button */}
      <div className="px-8 pb-10">
        <button
          onClick={() => setShowPin(true)}
          className="w-full rounded-2xl bg-white py-5 text-lg font-bold text-emerald-600 shadow-lg transition hover:bg-emerald-50 active:scale-[0.98]"
        >
          Check Back In
        </button>
      </div>

      {showPin && (
        <PinModal
          title={`Welcome back, ${firstName}!`}
          onSubmit={handleCheckin}
          onClose={() => setShowPin(false)}
        />
      )}
    </div>
  )
}
