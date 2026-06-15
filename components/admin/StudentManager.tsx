'use client'

import { useState } from 'react'
import type { Student } from '@/lib/types'

interface Props {
  students: Student[]
  token: string
  onRefresh: () => void
}

const emptyForm = { name: '', gender: 'female' as 'male' | 'female', pin: '' }

export default function StudentManager({ students, token, onRefresh }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; gender: 'male' | 'female'; pin: string; active: boolean }>({ name: '', gender: 'female', pin: '', active: true })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = async () => {
    if (!form.name || !form.pin || form.pin.length !== 4) {
      setError('Name and 4-digit PIN required')
      return
    }
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/students', {
      method: 'POST',
      headers,
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setForm(emptyForm)
    onRefresh()
    setLoading(false)
  }

  const startEdit = (s: Student) => {
    setEditId(s.id)
    setEditForm({ name: s.name, gender: s.gender, pin: '', active: s.active })
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    setLoading(true)
    setError('')
    const body: Record<string, unknown> = { name: editForm.name, gender: editForm.gender, active: editForm.active }
    if (editForm.pin) body.pin = editForm.pin
    const res = await fetch(`/api/admin/students/${editId}`, { method: 'PUT', headers, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setEditId(null)
    onRefresh()
    setLoading(false)
  }

  const handleDeactivate = async (id: string, active: boolean) => {
    await fetch(`/api/admin/students/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ active: !active }),
    })
    onRefresh()
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Students</h2>

      {/* Add student */}
      <div className="mb-8 rounded-xl border border-white/20 p-4">
        <h3 className="mb-4 font-bold text-forest-300">Add New Student</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            type="text"
            placeholder="Full name (Last, First)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-forest-300"
          />
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value as 'male' | 'female' })}
            className="rounded-lg border border-white/20 bg-forest-800 px-3 py-2 text-white focus:outline-none"
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
          <input
            type="text"
            placeholder="4-digit PIN"
            maxLength={4}
            value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-forest-300"
          />
          <button
            onClick={handleAdd}
            disabled={loading}
            className="rounded-lg bg-forest-500 px-4 py-2 font-bold text-white hover:bg-forest-600 disabled:opacity-50"
          >
            Add Student
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search students..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-forest-300"
      />

      {/* Student list */}
      <div className="overflow-x-auto rounded-xl border border-white/20">
        <table className="w-full text-sm">
          <thead className="border-b border-white/20 bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left font-bold">Name</th>
              <th className="px-4 py-3 text-left font-bold">Gender</th>
              <th className="px-4 py-3 text-left font-bold">Status</th>
              <th className="px-4 py-3 text-left font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className={`border-b border-white/10 ${!s.active ? 'opacity-50' : ''}`}>
                {editId === s.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full rounded bg-white/10 px-2 py-1 text-white focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editForm.gender}
                        onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as 'male' | 'female' })}
                        className="rounded bg-forest-800 px-2 py-1 text-white"
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="New PIN (leave blank to keep)"
                        maxLength={4}
                        value={editForm.pin}
                        onChange={(e) => setEditForm({ ...editForm, pin: e.target.value.replace(/\D/g, '') })}
                        className="w-28 rounded bg-white/10 px-2 py-1 text-white focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="rounded bg-forest-500 px-3 py-1 font-bold text-white hover:bg-forest-600">Save</button>
                        <button onClick={() => setEditId(null)} className="rounded bg-white/20 px-3 py-1 text-white hover:bg-white/30">Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 capitalize text-white/70">{s.gender}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${s.active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(s)} className="rounded bg-forest-600/50 px-3 py-1 text-sm text-white hover:bg-forest-600">Edit</button>
                        <button
                          onClick={() => handleDeactivate(s.id, s.active)}
                          className="rounded bg-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/20"
                        >
                          {s.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center italic text-white/40">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
