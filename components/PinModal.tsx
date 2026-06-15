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

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('PIN must be 4 digits')
      return
    }
    setLoading(true)
    setError('')
    const err = await onSubmit(pin)
    if (err) {
      setError(err)
      setPin('')
      inputRef.current?.focus()
    }
    setLoading(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border-2 border-forest-600 bg-forest-800 p-8 shadow-2xl">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">{title}</h2>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={handleKey}
          placeholder="••••"
          className="mb-2 w-full rounded-xl border-2 border-forest-600 bg-white/10 px-4 py-4 text-center text-3xl tracking-[0.5em] text-white placeholder-white/40 focus:border-forest-300 focus:outline-none"
        />

        <p className="mb-6 min-h-[1.5rem] text-center text-sm font-semibold text-forest-300">
          {error}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-white/20 py-3 font-bold text-white transition hover:bg-white/30 active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || pin.length !== 4}
            className="flex-1 rounded-xl bg-forest-500 py-3 font-bold text-white transition hover:bg-forest-600 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
