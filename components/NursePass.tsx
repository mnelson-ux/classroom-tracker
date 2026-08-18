'use client'

import { useEffect, useState } from 'react'

// Full-screen anonymous nurse pass. The name is shown on this device only (for
// the teacher to see) and is NOT stored anywhere — the server knows only a token.
export default function NursePass({ token, name, school, onClose }: {
  token: string
  name: string
  school: string
  onClose: () => void
}) {
  const [start] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState('0:00')
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const tick = () => {
      const s = Math.floor((Date.now() - start) / 1000)
      setElapsed(`${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [start])

  const first = name.includes(',') ? name.split(',')[1]?.trim() ?? name : name
  const last = name.includes(',') ? name.split(',')[0]?.trim() : ''

  const checkIn = async () => {
    setClosing(true)
    try { await fetch('/api/nurse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'checkin', token, school }) }) } catch {}
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-red-500">
      <div className="flex items-center justify-between px-8 pt-8">
        <div className="rounded-full bg-white/20 px-4 py-2"><p className="text-sm font-semibold text-white">🩺 Nurse</p></div>
        <div className="rounded-full bg-white/20 px-4 py-2"><p className="text-sm font-semibold text-white">Anonymous pass</p></div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-white/30 border-t-white" style={{ animationDuration: '2s' }} />
          <span className="text-4xl">🩺</span>
        </div>
        <div>
          <p className="mb-1 text-lg font-medium uppercase tracking-widest text-white/80">Nurse Pass</p>
          <h1 className="text-5xl font-bold text-white sm:text-7xl">{first}</h1>
          {last && <p className="mt-2 text-xl font-medium text-white/80">{last}</p>}
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-6xl font-bold tabular-nums text-white">{elapsed}</p>
          <p className="text-base text-white/70">This visit is not recorded.</p>
        </div>
      </div>

      <div className="px-8 pb-10">
        <button onClick={checkIn} disabled={closing}
          className="w-full rounded-2xl bg-white py-5 text-lg font-bold text-gray-900 shadow-lg transition hover:bg-gray-100 active:scale-[0.98] disabled:opacity-60">
          {closing ? 'Checking in…' : 'Check Back In'}
        </button>
      </div>
    </div>
  )
}
