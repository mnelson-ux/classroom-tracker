'use client'

import { useEffect, useState } from 'react'
import StudentManager from '@/components/admin/StudentManager'
import TeacherManager from '@/components/admin/TeacherManager'
import RoomManager from '@/components/admin/RoomManager'
import SettingsManager from '@/components/admin/SettingsManager'
import HistoryView from '@/components/admin/HistoryView'
import type { AuthState, Student, Teacher, Room } from '@/lib/types'

type Tab = 'students' | 'teachers' | 'rooms' | 'settings' | 'history'

export default function AdminPage() {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState<Tab>('students')
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [settings, setSettings] = useState<any[]>([])
  const [loadError, setLoadError] = useState('')

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

  const loadAll = async () => {
    if (!auth?.token) return
    const h = { Authorization: `Bearer ${auth.token}` }
    const [sRes, tRes, rRes, stRes] = await Promise.all([
      fetch('/api/admin/students', { headers: h }),
      fetch('/api/admin/teachers', { headers: h }),
      fetch('/api/admin/rooms', { headers: h }),
      fetch('/api/admin/settings', { headers: h }),
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
  }, [auth]) // eslint-disable-line

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
        <div className="text-xl text-forest-300">Loading...</div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'students', label: 'Students' },
    { id: 'teachers', label: 'Teachers' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'settings', label: 'Settings' },
    { id: 'history', label: 'History' },
  ]

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="border-b border-white/10 bg-forest-900 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-sm text-white/50">Logged in as {auth.userName}</p>
          </div>
          <div className="flex gap-3">
            <a href="/" className="rounded-lg bg-forest-600/50 px-4 py-2 text-sm font-bold text-white hover:bg-forest-600">
              View Site
            </a>
            <button onClick={handleLogout} className="rounded-lg bg-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/30">
              Log Out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Tab nav */}
        <div className="mb-8 flex gap-1 rounded-xl bg-forest-900 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
                tab === t.id
                  ? 'bg-forest-600 text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'students' && (
          <StudentManager students={students} token={auth.token!} onRefresh={loadAll} />
        )}
        {tab === 'teachers' && (
          <TeacherManager teachers={teachers} rooms={rooms} token={auth.token!} onRefresh={loadAll} />
        )}
        {tab === 'rooms' && (
          <RoomManager rooms={rooms} token={auth.token!} onRefresh={loadAll} />
        )}
        {tab === 'settings' && (
          <SettingsManager settings={settings} token={auth.token!} onRefresh={loadAll} />
        )}
        {tab === 'history' && (
          <HistoryView token={auth.token!} students={students} />
        )}
      </div>
    </div>
  )
}
