'use client'

import { useState } from 'react'
import type { AuthState } from '@/lib/types'

interface Props {
  onSuccess: (auth: AuthState) => void
  onClose: () => void
}

export default function LoginModal({ onSuccess, onClose }: Props) {
  const [tab, setTab] = useState<'teacher' | 'admin'>('teacher')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Enter username and password')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, userType: tab }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Login failed')
      setLoading(false)
      return
    }

    const auth: AuthState = {
      isAuthenticated: true,
      userType: data.userType,
      userId: data.userId ?? null,
      userName: data.userName,
      token: data.token,
    }

    localStorage.setItem('auth', JSON.stringify(auth))
    onSuccess(auth)

    if (tab === 'admin') {
      window.location.href = '/admin'
    } else {
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border-2 border-forest-600 bg-forest-800 p-8">
        <div className="mb-6 flex rounded-xl bg-forest-900 p-1">
          <button
            onClick={() => setTab('teacher')}
            className={`flex-1 rounded-lg py-2 font-bold transition ${
              tab === 'teacher' ? 'bg-forest-600 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            Teacher
          </button>
          <button
            onClick={() => setTab('admin')}
            className={`flex-1 rounded-lg py-2 font-bold transition ${
              tab === 'admin' ? 'bg-forest-600 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            Admin
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-white/80">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="w-full rounded-xl border-2 border-forest-600 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:border-forest-300 focus:outline-none"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-semibold text-white/80">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            autoComplete="current-password"
            className="w-full rounded-xl border-2 border-forest-600 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:border-forest-300 focus:outline-none"
          />
        </div>

        {error && (
          <p className="mb-4 text-center text-sm font-semibold text-red-300">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-white/20 py-3 font-bold text-white transition hover:bg-white/30"
          >
            Cancel
          </button>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex-1 rounded-xl bg-forest-500 py-3 font-bold text-white transition hover:bg-forest-600 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  )
}
