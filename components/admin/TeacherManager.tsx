'use client'

import { useState } from 'react'
import type { Teacher, Room } from '@/lib/types'

interface Props {
  teachers: Teacher[]
  rooms: Room[]
  token: string
  onRefresh: () => void
}

const emptyForm = { name: '', username: '', password: '', room_id: '' }

export default function TeacherManager({ teachers, rooms, token, onRefresh }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', username: '', password: '', room_id: '', active: true })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  const input = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-700/20'
  const select = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none'

  const handleAdd = async () => {
    if (!form.name || !form.username || !form.password) { setError('All fields required'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/admin/teachers', { method: 'POST', headers, body: JSON.stringify({ ...form, room_id: form.room_id || null }) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setForm(emptyForm); onRefresh(); setLoading(false)
  }

  const startEdit = (t: Teacher) => {
    setEditId(t.id)
    setEditForm({ name: t.name, username: t.username, password: '', room_id: t.room_id ?? '', active: t.active })
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    setLoading(true); setError('')
    const body: Record<string, unknown> = { name: editForm.name, username: editForm.username, room_id: editForm.room_id || null, active: editForm.active }
    if (editForm.password) body.password = editForm.password
    const res = await fetch(`/api/admin/teachers/${editId}`, { method: 'PUT', headers, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setEditId(null); onRefresh(); setLoading(false)
  }

  const handleToggle = async (id: string, active: boolean) => {
    await fetch(`/api/admin/teachers/${id}`, { method: 'PUT', headers, body: JSON.stringify({ active: !active }) })
    onRefresh()
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return
    setError('')
    const res = await fetch(`/api/admin/teachers/${id}`, { method: 'DELETE', headers })
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Delete failed'); return }
    onRefresh()
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Teachers</h2>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-800">Add New Teacher</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="text" placeholder="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
          <input type="text" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={input} />
          <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={input} />
          <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} className={select}>
            <option value="">No room</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button onClick={handleAdd} disabled={loading} className="rounded-xl bg-purple-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-900 disabled:opacity-40">
            Add Teacher
          </button>
        </div>
        {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {['Name', 'Username', 'Room', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {teachers.map((t) => (
              <tr key={t.id} className={`transition hover:bg-gray-50 ${!t.active ? 'opacity-40' : ''}`}>
                {editId === t.id ? (
                  <>
                    <td className="px-4 py-3"><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none" /></td>
                    <td className="px-4 py-3"><input type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none" /></td>
                    <td className="px-4 py-3">
                      <select value={editForm.room_id} onChange={(e) => setEditForm({ ...editForm, room_id: e.target.value })} className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-900 focus:outline-none">
                        <option value="">No room</option>
                        {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3"><input type="password" placeholder="New password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="w-32 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none" /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="rounded-lg bg-purple-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-900">Save</button>
                        <button onClick={() => setEditId(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50">Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 text-gray-500">{t.username}</td>
                    <td className="px-4 py-3 text-gray-500">{(t as any).rooms?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {t.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(t)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50">Edit</button>
                        <button onClick={() => handleToggle(t.id, t.active)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50">
                          {t.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleDelete(t.id, t.name)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">Delete</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
