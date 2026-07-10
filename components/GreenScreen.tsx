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

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

// Rotating globe — cycles every 400ms so a screenshot can't reproduce the live motion.
function useRotatingGlobe() {
  const globes = ['🌍', '🌎', '🌏']
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % 3), 400)
    return () => clearInterval(id)
  }, [])
  return globes[i]
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
  const globe = useRotatingGlobe()
  const today = formatDate(new Date())

  // Background color depends on where the student went.
  const bgByLocation: Record<string, string> = {
    Bathroom: 'bg-yellow-500',
    Office: 'bg-emerald-500',
    Nurse: 'bg-red-500',
  }
  const bgColor = bgByLocation[checkout.location] ?? 'bg-emerald-500'

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
    <div className={`fixed inset-0 z-40 flex flex-col ${bgColor}`}>
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
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
        {/* Rotating globe inside a spinning ring — motion proves this is live, not a screenshot */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-white/30 border-t-white" style={{ animationDuration: '2s' }} />
          <span className="text-5xl" role="img" aria-label="rotating globe">{globe}</span>
        </div>

        <div>
          <p className="mb-1 text-lg font-medium text-white/80 uppercase tracking-widest">Checked Out</p>
          <h1 className="text-5xl font-bold text-white sm:text-7xl">{firstName}</h1>
          <p className="mt-2 text-xl font-medium text-white/80">{student.name.split(',')[0]}</p>
        </div>

        {/* Big date — readable from across the room */}
        <p className="text-3xl font-bold text-white sm:text-5xl">{today}</p>

        <div className="flex flex-col items-center gap-1">
          <p className="text-6xl font-bold tabular-nums text-white">{elapsed}</p>
          <p className="text-base text-white/70">Left at {formatTime(checkout.check_out_time)}</p>
        </div>
      </div>

      {/* Check back in button */}
      <div className="px-8 pb-10">
        <button
          onClick={() => setShowPin(true)}
          className="w-full rounded-2xl bg-white py-5 text-lg font-bold text-gray-900 shadow-lg transition hover:bg-gray-100 active:scale-[0.98]"
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
