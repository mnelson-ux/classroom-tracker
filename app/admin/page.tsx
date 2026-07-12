'use client'

import { useEffect, useState } from 'react'
import StudentManager from '@/components/admin/StudentManager'
import TeacherManager from '@/components/admin/TeacherManager'
import RoomManager from '@/components/admin/RoomManager'
import SettingsManager from '@/components/admin/SettingsManager'
import HistoryView from '@/components/admin/HistoryView'
import FeedbackManager from '@/components/admin/FeedbackManager'
import { SCHOOLS } from '@/lib/schools'
import type { AuthState, Student, Teacher, Room } from '@/lib/types'

type Tab = 'students' | 'teachers' | 'rooms' | 'settings' | 'history' | 'requests'

export default function AdminPage() {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState<Tab>('students')
  const [school, setSchool] = useState('hs')
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [settings, setSettings] = useState<any[]>([])
  const [loadError, setLoadError] = useState('')
  const [autoResetNotice, setAutoResetNotice] = useState('')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth')
      if (stored) {
        const parsed: AuthState = JSON.parse(stored)
        if (parsed.userType === 'admin' && parsed.token) {
          setAuth(parsed)
          setChecking(false)
          return
        }
      }
    } catch {}
    window.location.href = '/'
  }, [])

  // On load, run the automatic year-end reset for any school where it's due.
  useEffect(() => {
    if (!auth?.token) return
    ;(async () => {
      const notices: string[] = []
      for (const sc of ['hs', 'ms']) {
        try {
          const res = await fetch('/api/admin/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
            body: JSON.stringify({ action: 'auto_check', school: sc }),
          })
          const d = await res.json()
          if (d.triggered) notices.push(`${sc === 'hs' ? 'High School' : 'Middle School'}: ${d.message}`)
        } catch {}
      }
      if (notices.length) { setAutoResetNotice(notices.join(' ')); loadAll() }
    })()
  }, [auth]) // eslint-disable-line

  const loadAll = async () => {
    if (!auth?.token) return
    const h = { Authorization: `Bearer ${auth.token}` }
    const q = `school=${school}&ts=${Date.now()}`
    const [sRes, tRes, rRes, stRes] = await Promise.all([
      fetch(`/api/admin/students?${q}`, { headers: h, cache: 'no-store' }),
      fetch(`/api/admin/teachers?${q}`, { headers: h, cache: 'no-store' }),
      fetch(`/api/admin/rooms?${q}`, { headers: h, cache: 'no-store' }),
      fetch(`/api/admin/settings?${q}`, { headers: h, cache: 'no-store' }),
    ])

    if (sRes.status === 401) {
      localStorage.removeItem('auth')
      window.location.href = '/'
      return
    }

    const [s, t, r, st] = await Promise.all([sRes.json(), tRes.json(), rRes.json(), stRes.json()])
    setStudents(s)
    setTeachers(t)
    setRooms(r)
    setSettings(st)
  }

  useEffect(() => {
    if (auth) loadAll()
  }, [auth, school]) // eslint-disable-line

  const handleLogout = async () => {
    if (auth?.token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
      })
    }
    localStorage.removeItem('auth')
    window.location.href = '/'
  }

  if (checking || !auth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-purple-800" />
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'students', label: 'Students' },
    { id: 'teachers', label: 'Teachers' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'settings', label: 'Settings' },
    { id: 'history', label: 'History' },
    { id: 'requests', label: 'Requests' },
  ]

  return (
    <div className="min-h-screen">
      {autoResetNotice && (
        <div className="bg-amber-100 px-6 py-3 text-center text-sm font-semibold text-amber-800">
          ⏰ Automatic year-end reset ran — {autoResetNotice}
          <button onClick={() => setAutoResetNotice('')} className="ml-3 underline">dismiss</button>
        </div>
      )}
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500">Logged in as {auth.userName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex gap-1 rounded-xl bg-gray-100 p-1">
              {SCHOOLS.map((s) => (
                <button key={s.id} onClick={() => setSchool(s.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${school === s.id ? 'bg-white text-purple-800 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <a href={`/${school}`} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50">
              View Site
            </a>
            <button onClick={handleLogout} className="rounded-full bg-purple-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-900">
              Log Out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Tab nav */}
        <div className="mb-8 flex gap-1 rounded-xl bg-white p-1 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                tab === t.id
                  ? 'bg-purple-800 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'students' && (
          <StudentManager students={students} token={auth.token!} school={school} onRefresh={loadAll} />
        )}
        {tab === 'teachers' && (
          <TeacherManager teachers={teachers} rooms={rooms} token={auth.token!} school={school} onRefresh={loadAll} />
        )}
        {tab === 'rooms' && (
          <RoomManager rooms={rooms} token={auth.token!} school={school} onRefresh={loadAll} />
        )}
        {tab === 'settings' && (
          <SettingsManager settings={settings} token={auth.token!} school={school} onRefresh={loadAll} />
        )}
        {tab === 'history' && (
          <HistoryView token={auth.token!} students={students} school={school} />
        )}
        {tab === 'requests' && (
          <FeedbackManager token={auth.token!} />
        )}
      </div>
    </div>
  )
}
