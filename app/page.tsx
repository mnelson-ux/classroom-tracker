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
    const tick = () => {
      setTime(new Date().toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
      }))
    }
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

  // Green screen state — shown when THIS device just checked out a student
  const [greenScreen, setGreenScreen] = useState<{
    checkout: Checkout
    student: Student
  } | null>(null)

  const clock = useClock()

  // Load initial data
  const loadData = useCallback(async () => {
    const [studentsRes, teachersRes, checkoutsRes, settingsRes] = await Promise.all([
      fetch('/api/students'),
      fetch('/api/teachers'),
      fetch('/api/checkouts'),
      fetch('/api/settings'),
    ])

    const [studentsData, teachersData, checkoutsData, settingsData] = await Promise.all([
      studentsRes.json(),
      teachersRes.json(),
      checkoutsRes.json(),
      settingsRes.json(),
    ])

    setStudents(studentsData)
    setTeachers(teachersData)
    setActiveCheckouts(checkoutsData)
    setSettings(settingsData)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()

    // Restore auth from localStorage
    try {
      const stored = localStorage.getItem('auth')
      if (stored) setAuth(JSON.parse(stored))
    } catch {}

    // Real-time subscription to checkouts table
    const channel = supabase
      .channel('checkouts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkouts' },
        () => {
          // Re-fetch active checkouts on any change
          fetch('/api/checkouts')
            .then((r) => r.json())
            .then(setActiveCheckouts)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadData])

  const handleCheckoutSuccess = (checkout: Checkout, student: Student) => {
    setGreenScreen({ checkout, student })
  }

  const handleCheckedIn = () => {
    setGreenScreen(null)
  }

  const handleLogout = async () => {
    if (auth?.token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
      })
    }
    localStorage.removeItem('auth')
    setAuth(null)
  }

  const pageTitle = settings.page_title ?? 'Classroom Check-In/Out Tracker'
  const girlsTitle = settings.girls_section_title ?? 'Girls'
  const boysTitle = settings.boys_section_title ?? 'Boys'

  const teacherForGreenScreen = greenScreen
    ? teachers.find((t) => t.id === greenScreen.checkout.teacher_id)
    : undefined

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-2xl font-bold text-forest-300">Loading...</div>
      </div>
    )
  }

  return (
    <>
      {/* Full-screen green screen overlay */}
      {greenScreen && (
        <GreenScreen
          checkout={greenScreen.checkout}
          student={greenScreen.student}
          teacher={teacherForGreenScreen}
          onCheckedIn={handleCheckedIn}
        />
      )}

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white md:text-5xl">{pageTitle}</h1>
          <div className="mt-2 text-2xl font-semibold text-forest-300">{clock}</div>
        </header>

        {/* Teacher status bar */}
        {auth?.isAuthenticated && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-forest-700 px-4 py-3">
            <span className="font-semibold text-forest-300">
              Logged in as {auth.userName} ({auth.userType})
            </span>
            <div className="flex gap-3">
              {auth.userType === 'admin' && (
                <a
                  href="/admin"
                  className="rounded-lg bg-forest-500 px-4 py-2 font-bold text-white hover:bg-forest-600"
                >
                  Admin Panel
                </a>
              )}
              <button
                onClick={handleLogout}
                className="rounded-lg bg-white/20 px-4 py-2 font-bold text-white hover:bg-white/30"
              >
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* Checkout forms */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <CheckoutForm
            gender="female"
            title={girlsTitle}
            students={students}
            teachers={teachers}
            activeCheckouts={activeCheckouts}
            onCheckoutSuccess={handleCheckoutSuccess}
          />
          <CheckoutForm
            gender="male"
            title={boysTitle}
            students={students}
            teachers={teachers}
            activeCheckouts={activeCheckouts}
            onCheckoutSuccess={handleCheckoutSuccess}
          />
        </div>

        {/* Currently checked out */}
        <section className="rounded-2xl bg-white/5 p-6">
          <h2 className="mb-4 text-2xl font-bold text-white">
            Currently Out ({activeCheckouts.length})
          </h2>
          <CheckedOutList checkouts={activeCheckouts} />
        </section>
      </div>

      {/* Hidden login button — bottom-right corner */}
      {!auth?.isAuthenticated && (
        <button
          onClick={() => setShowLogin(true)}
          className="fixed bottom-4 right-4 rounded-full bg-white/10 p-3 text-white/40 transition hover:bg-white/20 hover:text-white/80"
          title="Staff Login"
          aria-label="Staff Login"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </button>
      )}

      {showLogin && (
        <LoginModal
          onSuccess={(newAuth) => { setAuth(newAuth); setShowLogin(false) }}
          onClose={() => setShowLogin(false)}
        />
      )}
    </>
  )
}
