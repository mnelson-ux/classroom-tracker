'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  title: string
  onSubmit: (pin: string) => Promise<string | null>
  onClose: () => void
}

export default function PinModal({ title, onSubmit, onClose }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async () => {
    if (pin.length < 4) { setError('PIN must be 4 digits'); return }
    setLoading(true); setError('')
    const err = await onSubmit(pin)
    if (err) { setError(err); setPin(''); inputRef.current?.focus() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-1 text-center text-lg font-bold text-gray-900">{title}</h2>
        <p className="mb-5 text-center text-sm text-gray-500">Enter your 4-digit PIN</p>

        <input ref={inputRef} type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
          value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose() }}
          placeholder="••••"
          className="mb-2 w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-center text-3xl tracking-widest text-gray-900 placeholder-gray-300 focus:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-700/20" />

        {error && <p className="mb-4 text-center text-sm font-medium text-red-500">{error}</p>}
        {!error && <div className="mb-4" />}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={loading || pin.length !== 4}
            className="flex-1 rounded-xl bg-purple-800 py-3 text-sm font-semibold text-white hover:bg-purple-900 disabled:opacity-40 transition">
            {loading ? 'Checking...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
