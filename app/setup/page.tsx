'use client'

import { useEffect, useState } from 'react'

export default function SetupPage() {
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((d) => setSetupRequired(d.setupRequired))
  }, [])

  const handleSubmit = async () => {
    if (!username || !password) { setError('All fields required'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError('')

    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  if (setupRequired === null) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Loading...</div>
  }

  if (!setupRequired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-xl font-bold text-gray-900">Admin account already exists.</p>
        <a href="/" className="rounded-lg bg-purple-800 px-6 py-3 font-bold text-white hover:bg-purple-900">Go to App</a>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50">
        <div className="text-6xl">✓</div>
        <h1 className="text-3xl font-bold text-gray-900">Admin account created!</h1>
        <p className="text-gray-500">You can now log in using the Staff Login button on the main page.</p>
        <a href="/" className="rounded-xl bg-purple-800 px-8 py-4 text-xl font-bold text-white hover:bg-purple-900">
          Go to App
        </a>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">First-Time Setup</h1>
        <p className="mb-8 text-gray-500">Create your admin account to manage the tracker.</p>

        <div className="mb-4">
          <label className="mb-1 block font-semibold text-gray-900">Admin Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 focus:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-700/20" />
        </div>

        <div className="mb-4">
          <label className="mb-1 block font-semibold text-gray-900">Password (min 8 characters)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 focus:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-700/20" />
        </div>

        <div className="mb-6">
          <label className="mb-1 block font-semibold text-gray-900">Confirm Password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 focus:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-700/20" />
        </div>

        {error && <p className="mb-4 text-center text-sm font-semibold text-red-500">{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full rounded-xl bg-purple-800 py-4 text-lg font-bold text-white hover:bg-purple-900 disabled:opacity-50">
          {loading ? 'Creating account...' : 'Create Admin Account'}
        </button>
      </div>
    </div>
  )
}
