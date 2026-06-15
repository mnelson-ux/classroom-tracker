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

  const handleAdd = async () => {
    if (!form.name || !form.username || !form.password) { setError('All fields required'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/admin/teachers', {
      method: 'POST', headers,
      body: JSON.stringify({ ...form, room_id: form.room_id || null }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setForm(emptyForm)
    onRefresh()
    setLoading(false)
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
    setEditId(null)
    onRefresh()
    setLoading(false)
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Teachers</h2>

      <div className="mb-8 rounded-xl border border-white/20 p-4">
        <h3 className="mb-4 font-bold text-forest-300">Add New Teacher</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input type="text" placeholder="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-forest-300" />
          <input type="text" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-forest-300" />
          <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-forest-300" />
          <select value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} className="rounded-lg border border-white/20 bg-forest-800 px-3 py-2 text-white focus:outline-none">
            <option value="">No room</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button onClick={handleAdd} disabled={loading} className="rounded-lg bg-forest-500 px-4 py-2 font-bold text-white hover:bg-forest-600 disabled:opacity-50">Add Teacher</button>
        </div>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/20">
        <table className="w-full text-sm">
          <thead className="border-b border-white/20 bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left font-bold">Name</th>
              <th className="px-4 py-3 text-left font-bold">Username</th>
              <th className="px-4 py-3 text-left font-bold">Room</th>
              <th className="px-4 py-3 text-left font-bold">Status</th>
              <th className="px-4 py-3 text-left font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id} className={`border-b border-white/10 ${!t.active ? 'opacity-50' : ''}`}>
                {editId === t.id ? (
                  <>
                    <td className="px-4 py-2"><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded bg-white/10 px-2 py-1 text-white focus:outline-none" /></td>
                    <td className="px-4 py-2"><input type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className="w-full rounded bg-white/10 px-2 py-1 text-white focus:outline-none" /></td>
                    <td className="px-4 py-2">
                      <select value={editForm.room_id} onChange={(e) => setEditForm({ ...editForm, room_id: e.target.value })} className="rounded bg-forest-800 px-2 py-1 text-white">
                        <option value="">No room</option>
                        {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2"><input type="password" placeholder="New password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="w-32 rounded bg-white/10 px-2 py-1 text-white focus:outline-none" /></td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="rounded bg-forest-500 px-3 py-1 font-bold text-white hover:bg-forest-600">Save</button>
                        <button onClick={() => setEditId(null)} className="rounded bg-white/20 px-3 py-1 text-white hover:bg-white/30">Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3 text-white/70">{t.username}</td>
                    <td className="px-4 py-3 text-white/70">{(t as any).rooms?.name ?? '—'}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${t.active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>{t.active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(t)} className="rounded bg-forest-600/50 px-3 py-1 text-sm text-white hover:bg-forest-600">Edit</button>
                        <button onClick={async () => { await fetch(`/api/admin/teachers/${t.id}`, { method: 'PUT', headers, body: JSON.stringify({ active: !t.active }) }); onRefresh() }} className="rounded bg-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/20">{t.active ? 'Deactivate' : 'Activate'}</button>
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
