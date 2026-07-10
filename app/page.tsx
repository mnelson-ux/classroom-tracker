'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import CheckoutForm from '@/components/CheckoutForm'
import CheckedOutList from '@/components/CheckedOutList'
import GreenScreen from '@/components/GreenScreen'
import LoginModal from '@/components/LoginModal'
import type { Student, Teacher, Checkout, Settings, AuthState } from '@/lib/types'

function useClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

export default function HomePage() {
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [activeCheckouts, setActiveCheckouts] = useState<Checkout[]>([])
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [greenScreen, setGreenScreen] = useState<{ checkout: Checkout; student: Student } | null>(null)

  const clock = useClock()

  const loadData = useCallback(async () => {
    try {
      const ts = Date.now()
      const [sRes, tRes, cRes, stRes] = await Promise.all([
        fetch(`/api/students?ts=${ts}`, { cache: 'no-store' }),
        fetch(`/api/teachers?ts=${ts}`, { cache: 'no-store' }),
        fetch(`/api/checkouts?ts=${ts}`, { cache: 'no-store' }),
        fetch(`/api/settings?ts=${ts}`, { cache: 'no-store' }),
      ])
      const [s, t, c, st] = await Promise.all([
        sRes.json().catch(() => []), tRes.json().catch(() => []),
        cRes.json().catch(() => []), stRes.json().catch(() => ({})),
      ])
      if (Array.isArray(s)) setStudents(s)
      if (Array.isArray(t)) setTeachers(t)
      if (Array.isArray(c)) setActiveCheckouts(c)
      if (st && typeof st === 'object' && !st.error) setSettings(st)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadData()
    try { const stored = localStorage.getItem('auth'); if (stored) setAuth(JSON.parse(stored)) } catch {}
    const handleVisibility = () => { if (document.visibilityState === 'visible') loadData() }
    document.addEventListener('visibilitychange', handleVisibility)
    const pollInterval = setInterval(loadData, 30000)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    if (url.includes('placeholder')) return
    const channel = supabase.channel('checkouts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkouts' }, () => {
        fetch(`/api/checkouts?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()).then(d => { if (Array.isArray(d)) setActiveCheckouts(d) }).catch(() => {})
      }).subscribe()
    return () => { supabase.removeChannel(channel); document.removeEventListener('visibilitychange', handleVisibility); clearInterval(pollInterval) }
  }, [loadData])

  const handleLogout = async () => {
    if (auth?.token) await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${auth.token}` } })
    localStorage.removeItem('auth')
    setAuth(null)
  }

  const pageTitle = settings.page_title ?? 'Classroom Check-In/Out Tracker'
  const girlsTitle = settings.girls_section_title ?? 'Girls'
  const boysTitle = settings.boys_section_title ?? 'Boys'
  const teacherForGreenScreen = greenScreen ? teachers.find(t => t.id === greenScreen.checkout.teacher_id) : undefined

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-purple-800" />
      </div>
    )
  }

  return (
    <>
      {greenScreen && (
        <GreenScreen checkout={greenScreen.checkout} student={greenScreen.student}
          teacher={teacherForGreenScreen} onCheckedIn={() => setGreenScreen(null)} />
      )}

      {/* Header — school purple with gold accent */}
      <header className="sticky top-0 z-10 bg-purple-800 shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-white">{pageTitle}</h1>
            <p className="text-sm font-semibold text-amber-400">{clock}</p>
          </div>
          {auth?.isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-purple-200 sm:block">{auth.userName}</span>
              {auth.userType === 'admin' && (
                <a href="/admin" className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 transition">Admin Panel</a>
              )}
              <button onClick={handleLogout} className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition">Log Out</button>
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)} className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition">Staff Login</button>
          )}
        </div>
        <div className="h-1 w-full bg-amber-400" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <CheckoutForm gender="female" title={girlsTitle} students={students} teachers={teachers}
            activeCheckouts={activeCheckouts} onCheckoutSuccess={(co, st) => setGreenScreen({ checkout: co, student: st })} />
          <CheckoutForm gender="male" title={boysTitle} students={students} teachers={teachers}
            activeCheckouts={activeCheckouts} onCheckoutSuccess={(co, st) => setGreenScreen({ checkout: co, student: st })} />
        </div>

        {auth?.isAuthenticated && (auth.userType === 'teacher' || auth.userType === 'admin') && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Currently Out</h2>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-800">
                {activeCheckouts.length} student{activeCheckouts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <CheckedOutList checkouts={activeCheckouts} />
          </div>
        )}
      </main>

      {showLogin && (
        <LoginModal onSuccess={(a) => { setAuth(a); setShowLogin(false) }} onClose={() => setShowLogin(false)} />
      )}
    </>
  )
}
