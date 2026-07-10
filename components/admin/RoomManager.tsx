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
    setNewName(''); onRefresh(); setLoading(false)
  }

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return
    setLoading(true)
    await fetch(`/api/admin/rooms/${id}`, { method: 'PUT', headers, body: JSON.stringify({ name: editName }) })
    setEditId(null); onRefresh(); setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this room? Teachers assigned to it will be unassigned.')) return
    await fetch(`/api/admin/rooms/${id}`, { method: 'DELETE', headers })
    onRefresh()
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Rooms / Classrooms</h2>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-purple-800">Add New Room</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Room name (e.g. Nelson, Room 204)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-700/20"
          />
          <button onClick={handleAdd} disabled={loading}
            className="rounded-xl bg-purple-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-900 disabled:opacity-40">
            Add Room
          </button>
        </div>
        {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            {editId === r.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(r.id); if (e.key === 'Escape') setEditId(null) }}
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 focus:border-purple-700 focus:outline-none"
                  autoFocus
                />
                <div className="ml-2 flex gap-1">
                  <button onClick={() => handleEdit(r.id)} className="rounded-lg bg-purple-800 px-3 py-1.5 text-xs font-semibold text-white">Save</button>
                  <button onClick={() => setEditId(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-900">Cancel</button>
                </div>
              </>
            ) : (
              <>
                <span className="font-semibold text-gray-900">{r.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditId(r.id); setEditName(r.name) }} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50">Edit</button>
                  <button onClick={() => handleDelete(r.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
        {rooms.length === 0 && <p className="text-sm italic text-gray-500">No rooms yet</p>}
      </div>
    </div>
  )
}
