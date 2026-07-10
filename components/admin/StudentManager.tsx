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
  const [editForm, setEditForm] = useState({ name: '', gender: 'female' as 'male' | 'female', pin: '', active: true })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  const filtered = students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))

  const input = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-700/20'
  const select = 'rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none'

  const handleAdd = async () => {
    if (!form.name || !form.pin || form.pin.length !== 4) { setError('Name and 4-digit PIN required'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/admin/students', { method: 'POST', headers, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setForm(emptyForm); onRefresh(); setLoading(false)
  }

  const startEdit = (s: Student) => {
    setEditId(s.id)
    setEditForm({ name: s.name, gender: s.gender, pin: '', active: s.active })
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    setLoading(true); setError('')
    const body: Record<string, unknown> = { name: editForm.name, gender: editForm.gender, active: editForm.active }
    if (editForm.pin) body.pin = editForm.pin
    const res = await fetch(`/api/admin/students/${editId}`, { method: 'PUT', headers, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setEditId(null); onRefresh(); setLoading(false)
  }

  const handleToggle = async (id: string, active: boolean) => {
    await fetch(`/api/admin/students/${id}`, { method: 'PUT', headers, body: JSON.stringify({ active: !active }) })
    onRefresh()
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Students</h2>

      {/* Add form */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-800">Add New Student</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="text" placeholder="Full name (Last, First)" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as 'male' | 'female' })} className={select}>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
          <input type="text" placeholder="4-digit PIN" maxLength={4} value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} className={input} />
          <button onClick={handleAdd} disabled={loading}
            className="rounded-xl bg-purple-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-900 disabled:opacity-40">
            Add Student
          </button>
        </div>
        {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
      </div>

      {/* Search */}
      <input type="text" placeholder="Search students..." value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`mb-4 ${input}`} />

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Gender</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((s) => (
              <tr key={s.id} className={`transition hover:bg-gray-50 ${!s.active ? 'opacity-40' : ''}`}>
                {editId === s.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none" />
                    </td>
                    <td className="px-4 py-3">
                      <select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as 'male' | 'female' })}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-900 focus:outline-none">
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input type="text" placeholder="New PIN (blank = keep)" maxLength={4} value={editForm.pin}
                        onChange={(e) => setEditForm({ ...editForm, pin: e.target.value.replace(/\D/g, '') })}
                        className="w-32 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="rounded-lg bg-purple-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-900">Save</button>
                        <button onClick={() => setEditId(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50">Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 capitalize text-gray-500">{s.gender}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(s)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50">Edit</button>
                        <button onClick={() => handleToggle(s.id, s.active)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50">
                          {s.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm italic text-gray-500">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
