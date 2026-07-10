'use client'

import { useState } from 'react'
import type { AuthState } from '@/lib/types'

interface Props {
  onSuccess: (auth: AuthState) => void
  onClose: () => void
}

const inputCls = 'w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-700/20'

export default function LoginModal({ onSuccess, onClose }: Props) {
  const [tab, setTab] = useState<'teacher' | 'admin'>('teacher')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!username || !password) { setError('Enter username and password'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, userType: tab }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Login failed'); setLoading(false); return }
    const auth: AuthState = { isAuthenticated: true, userType: data.userType, userId: data.userId ?? null, userName: data.userName, token: data.token }
    localStorage.setItem('auth', JSON.stringify(auth))
    onSuccess(auth)
    if (tab === 'admin') window.location.href = '/admin'
    else onClose()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-5 text-center text-xl font-bold text-gray-900">Staff Login</h2>

        <div className="mb-5 flex rounded-xl bg-gray-100 p-1">
          {(['teacher', 'admin'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition ${tab === t ? 'bg-white text-purple-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" className={inputCls} />
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-600">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="current-password" className={inputCls} />
        </div>

        {error && <p className="mb-4 text-center text-sm font-medium text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleLogin} disabled={loading}
            className="flex-1 rounded-xl bg-purple-800 py-3 text-sm font-semibold text-white hover:bg-purple-900 disabled:opacity-40 transition">
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  )
}
