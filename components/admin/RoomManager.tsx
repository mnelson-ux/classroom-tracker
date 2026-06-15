'use client'

import { useState } from 'react'
import type { Room } from '@/lib/types'

interface Props {
  rooms: Room[]
  token: string
  onRefresh: () => void
}

export default function RoomManager({ rooms, token, onRefresh }: Props) {
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const handleAdd = async () => {
    if (!newName.trim()) { setError('Room name required'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/admin/rooms', { method: 'POST', headers, body: JSON.stringify({ name: newName }) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setNewName('')
    onRefresh()
    setLoading(false)
  }

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return
    setLoading(true)
    await fetch(`/api/admin/rooms/${id}`, { method: 'PUT', headers, body: JSON.stringify({ name: editName }) })
    setEditId(null)
    onRefresh()
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room? Teachers assigned to it will be unassigned.')) return
    await fetch(`/api/admin/rooms/${id}`, { method: 'DELETE', headers })
    onRefresh()
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">Rooms / Classrooms</h2>

      <div className="mb-8 flex gap-3">
        <input
          type="text"
          placeholder="Room name (e.g. Nelson, Room 204)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-forest-300"
        />
        <button onClick={handleAdd} disabled={loading} className="rounded-lg bg-forest-500 px-6 py-2 font-bold text-white hover:bg-forest-600 disabled:opacity-50">Add Room</button>
      </div>
      {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/20 bg-white/5 px-4 py-3">
            {editId === r.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(r.id); if (e.key === 'Escape') setEditId(null) }}
                  className="flex-1 rounded bg-white/10 px-2 py-1 text-white focus:outline-none"
                  autoFocus
                />
                <div className="ml-2 flex gap-1">
                  <button onClick={() => handleEdit(r.id)} className="rounded bg-forest-500 px-2 py-1 text-xs font-bold text-white">Save</button>
                  <button onClick={() => setEditId(null)} className="rounded bg-white/20 px-2 py-1 text-xs text-white">Cancel</button>
                </div>
              </>
            ) : (
              <>
                <span className="font-semibold text-white">{r.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditId(r.id); setEditName(r.name) }} className="rounded bg-forest-600/50 px-2 py-1 text-xs text-white hover:bg-forest-600">Edit</button>
                  <button onClick={() => handleDelete(r.id)} className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/40">Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
        {rooms.length === 0 && <p className="col-span-3 italic text-white/40">No rooms yet</p>}
      </div>
    </div>
  )
}
