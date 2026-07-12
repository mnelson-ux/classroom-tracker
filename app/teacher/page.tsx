'use client'

import { useEffect, useState } from 'react'
import LoginModal from '@/components/LoginModal'
import TeacherTools from '@/components/TeacherTools'
import type { AuthState } from '@/lib/types'

export default function TeacherPage() {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth')
      if (stored) {
        const parsed: AuthState = JSON.parse(stored)
        if (parsed.isAuthenticated && parsed.token) { setAuth(parsed) }
      }
    } catch {}
    setReady(true)
  }, [])

  const handleLogout = async () => {
    if (auth?.token) await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${auth.token}` } })
    localStorage.removeItem('auth')
    setAuth(null)
  }

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-purple-800" /></div>
  }

  if (!auth?.isAuthenticated || !auth.token) {
    return (
      <>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Teacher Tools</h1>
          <p className="text-gray-500">Sign in with your teacher account to issue passes.</p>
        </div>
        <LoginModal onSuccess={(a) => setAuth(a)} onClose={() => (window.location.href = '/')} />
      </>
    )
  }

  return <TeacherTools token={auth.token} onLogout={handleLogout} />
}
