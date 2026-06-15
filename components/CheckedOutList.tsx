'use client'

import { useEffect, useState } from 'react'
import type { Checkout } from '@/lib/types'

interface Props {
  checkouts: Checkout[]
}

function elapsed(isoTime: string) {
  const diff = Math.floor((Date.now() - new Date(isoTime).getTime()) / 1000)
  const mins = Math.floor(diff / 60)
  const secs = diff % 60
  return `${mins}m ${secs.toString().padStart(2, '0')}s`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function CheckedOutList({ checkouts }: Props) {
  const [, setTick] = useState(0)

  // Re-render every second to update elapsed times
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (checkouts.length === 0) {
    return (
      <p className="py-8 text-center italic text-white/50">No students currently checked out</p>
    )
  }

  const boys = checkouts.filter((c) => (c.student as any)?.gender === 'male')
  const girls = checkouts.filter((c) => (c.student as any)?.gender === 'female')

  const Card = ({ c }: { c: Checkout }) => {
    const student = c.student as any
    const teacher = c.teacher as any
    const mins = Math.floor((Date.now() - new Date(c.check_out_time).getTime()) / 1000 / 60)
    const isLong = mins >= 8

    return (
      <div className={`rounded-xl border-2 p-4 transition ${
        isLong ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/20 bg-white/10'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-lg font-bold text-white">{student?.name ?? 'Unknown'}</div>
            <div className="text-sm text-white/70">
              {teacher?.name ?? ''} → <span className="font-semibold text-forest-300">{c.location}</span>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-bold ${isLong ? 'text-yellow-300' : 'text-white'}`}>
              {elapsed(c.check_out_time)}
            </div>
            <div className="text-xs text-white/50">since {formatTime(c.check_out_time)}</div>
          </div>
        </div>
        {isLong && (
          <div className="mt-2 text-xs font-semibold text-yellow-300">⚠ Been out a while</div>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-3 text-lg font-bold text-white/80">Boys ({boys.length})</h3>
        <div className="flex flex-col gap-3">
          {boys.length === 0
            ? <p className="text-sm italic text-white/40">None out</p>
            : boys.map((c) => <Card key={c.id} c={c} />)}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-lg font-bold text-white/80">Girls ({girls.length})</h3>
        <div className="flex flex-col gap-3">
          {girls.length === 0
            ? <p className="text-sm italic text-white/40">None out</p>
            : girls.map((c) => <Card key={c.id} c={c} />)}
        </div>
      </div>
    </div>
  )
}
