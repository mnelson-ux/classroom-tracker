'use client'

import { useEffect, useState } from 'react'
import type { Checkout } from '@/lib/types'

function elapsed(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  return `${Math.floor(diff / 60)}m ${(diff % 60).toString().padStart(2, '0')}s`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function CheckedOutList({ checkouts }: { checkouts: Checkout[] }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (checkouts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <div className="text-3xl text-gray-400">✓</div>
        <p className="text-sm text-gray-500">All students are in class</p>
      </div>
    )
  }

  const boys = checkouts.filter(c => (c.student as any)?.gender === 'male')
  const girls = checkouts.filter(c => (c.student as any)?.gender === 'female')

  const Card = ({ c }: { c: Checkout }) => {
    const student = c.student as any
    const teacher = c.teacher as any
    const mins = Math.floor((Date.now() - new Date(c.check_out_time).getTime()) / 1000 / 60)
    const isLong = mins >= 8
    return (
      <div className={`flex items-center justify-between rounded-xl border p-4 ${isLong ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{student?.name ?? 'Unknown'}</p>
          <p className="text-xs text-gray-500">
            {teacher?.name ?? ''} · <span className="font-semibold text-purple-700">{c.location}</span>
          </p>
        </div>
        <div className="ml-4 shrink-0 text-right">
          <p className={`font-bold tabular-nums ${isLong ? 'text-amber-600' : 'text-gray-800'}`}>{elapsed(c.check_out_time)}</p>
          <p className="text-xs text-gray-400">since {formatTime(c.check_out_time)}</p>
          {isLong && <p className="text-xs font-bold text-amber-600">⚠ Check on student</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[{ label: 'Girls', items: girls }, { label: 'Boys', items: boys }].map(({ label, items }) => (
        <div key={label}>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">{label} · {items.length} out</p>
          <div className="flex flex-col gap-2">
            {items.length === 0
              ? <p className="text-sm italic text-gray-400">None out</p>
              : items.map(c => <Card key={c.id} c={c} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
